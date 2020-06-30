import cv2
import threading
import atexit
import json
import logging
from flask import Flask, render_template, make_response, send_file

from grbl import outputLineAndWaitForReady
from jobs.video import VideoPipeline

POOL_TIME = 0.5 #Seconds

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
pipeline = None

log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)


# variables that are accessible from anywhere
previewImage = None
# lock to control access to variable
dataLock = threading.Lock()
# thread handler
pipelineThread = threading.Thread()


def create_app():
    app = Flask(__name__)

    @app.route('/')
    def index():
        return send_file('static/html/index.html', cache_timeout=-1)

    @app.route('/pipeline/<name>')
    def pipeline(name):
        global pipeline
        global dataLock
        print("Pipeline:", name)
        with dataLock:
            if pipeline:
                pipeline.stop()
            pipeline = VideoPipeline("./config/"+name+".ini")
            return send_file('static/html/pipeline.html', cache_timeout=-1)

    @app.route('/pipelines')
    def pipelines():
        from os import listdir
        from os.path import isfile, join, basename, splitext
        onlyfiles = [splitext(basename(f))[0] for f in listdir("./config") if isfile(join("./config", f))]
        print(onlyfiles)
        response = make_response(json.dumps(onlyfiles))
        response.headers['Content-Type'] = 'application/json'
        return response


    @app.route('/meta')
    def meta():
        global pipeline
        response = make_response(json.dumps(pipeline.meta()))
        response.headers['Content-Type'] = 'application/json'
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response

    @app.route('/gcode/<index>')
    def gcode(index):
        global pipeline
        global dataLock
        with dataLock:
            try:
                gcode = pipeline.gcode(int(index)).to_string()
                response = make_response(gcode,200)
                response.headers['Content-Type'] = 'application/txt'
                return response
            except Exception as exc:
                print(exc)
                return make_response("temporarly unavailable", 503)


    @app.route('/image/<index>', methods=['GET'])
    def input(index):
        global previewImage
        global dataLock
        with dataLock:
            try:
                # print("reading image from", previewImage[int(index)]["filter"])
                retval, buffer = cv2.imencode('.png', previewImage[int(index)]["image"])
                response = make_response(buffer.tobytes())
                response.headers['Content-Type'] = 'image/png'
                return response
            except:
                return make_response("temporarly unavailable", 503)


    @app.route('/machine/pendant/<axis>/<amount>', methods=['POST'])
    def machine_axis(axis, amount):
        global dataLock
        with dataLock:
            try:
                print(axis, amount)
                outputLineAndWaitForReady("$J=G21 G91 {}{} F100".format(axis,amount))
                return make_response("ok", 200)
            except:
                return make_response("temporarly unavailable", 503)


    @app.route('/machine/probe/<depth>/<speed>', methods=['POST'])
    def machine_probe(depth, speed):
        global dataLock
        with dataLock:
            try:
                print("probe")
                outputLineAndWaitForReady("G38.2 Z{} F{}".format(depth,speed))
                return make_response("ok", 200)
            except:
                return make_response("temporarly unavailable", 503)

    @app.route('/machine/milling/start', methods=['POST'])
    def machine_milling_start():
        global dataLock
        with dataLock:
            try:
                print("start milling")
                # reset the work coordinate system to 0/0/0 before start milling.
                # The method expect the the user has already place the milling head and did probing
                #
                outputLineAndWaitForReady("G10 P0 L20 X0 Y0 Z0".format(depth,speed))

                #
                return make_response("ok", 200)
            except:
                return make_response("temporarly unavailable", 503)

    @app.route('/machine/milling/stop', methods=['POST'])
    def machine_milling_stop():
        global dataLock
        with dataLock:
            try:
                print("probe")
                outputLineAndWaitForReady("G38.2 Z{} F{}".format(depth,speed))
                return make_response("ok", 200)
            except:
                return make_response("temporarly unavailable", 503)


    @app.route('/parameter/<index>/<value>', methods=['POST'])
    def parameter(index, value):
        global pipeline
        global dataLock
        with dataLock:
            try:
                pipeline.set_parameter(int(index),int(value))
                return make_response("ok",200)
            except Exception as exc:
                print(exc)
                return make_response("temporarly unavailable", 503)

    def interrupt():
        global pipelineThread
        pipelineThread.cancel()

    def processPipeline():
        global pipeline
        global previewImage
        global pipelineThread
        with dataLock:
            try:
                if pipeline:
                    previewImage = pipeline.process()
            except Exception as exc:
                print(exc)
                print("error during image processing...ignored")

        # Set the next thread to happen
        pipelineThread = threading.Timer(POOL_TIME, processPipeline, ())
        pipelineThread.start()

    def startPipeline():
        # Do initialisation stuff here
        global pipelineThread
        # Create your thread
        pipelineThread = threading.Timer(POOL_TIME, processPipeline, ())
        pipelineThread.start()

    # Initiate
    startPipeline()
    # When you kill Flask (SIGTERM), clear the trigger for the next thread
    atexit.register(interrupt)
    return app

app = create_app()
app.run(host="0.0.0.0", port=8080, debug=False,  threaded=False, use_reloader=False)

