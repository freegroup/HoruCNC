import cv2
import threading
import atexit
import json
import logging
import os

from flask import Flask, render_template, make_response, send_file
from utils.webgui import FlaskUI   # get the FlaskUI class

from pipeline import VideoPipeline
from grbl import GrblWriter
from utils.configuration import Configuration

configuration_dir = os.path.abspath(os.path.join(os.path.dirname(__file__),"..","config","configuration.ini"))
conf = Configuration(configuration_dir)

POOL_TIME       = conf.get_int("image-read-ms")/1000 # convert to Seconds
PIPELINE_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__),conf.get("pipelines")))
SERIAL_PORT     = conf.get("serial-port")
SERIAL_BAUD     = conf.get_int("serial-baud")

grbl = GrblWriter(SERIAL_PORT, SERIAL_BAUD)

log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)


app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
ui = FlaskUI(app= app, width=800, height=480, port=8080)


# global, thread base variables
previewImage = None         # the result of each pipeline run
dataLock = threading.Lock() # sync the access to "previewImage" of the different thread
pipelineJob = None          # the current, selected pipeline for image processing
jobThread = None            # runs the pipeline
millingThread = None        # runs the milling job


def create_app():

    @app.route('/')
    def index():
        return send_file('static/html/index.html', cache_timeout=-1)

    @app.route('/pipeline/<name>')
    def pipeline(name):
        global pipelineJob
        global dataLock
        global conf
        with dataLock:
            if pipelineJob:
                pipelineJob.stop()
            pipelineJob = VideoPipeline(conf, PIPELINE_FOLDER+"/"+name+".ini")
            return send_file('static/html/pipeline.html', cache_timeout=-1)

    @app.route('/pipelines')
    def pipelines():
        from os import listdir
        from os.path import isfile, join, basename, splitext
        onlyfiles = [join(PIPELINE_FOLDER, f) for f in listdir(PIPELINE_FOLDER) if isfile(join(PIPELINE_FOLDER, f))]
        pipelines = []
        for f in onlyfiles:
            conf = Configuration(f)

            pipelines.append({ "basename":splitext(basename(f))[0],
                            "name": conf.get("name"),
                            "description": conf.get("description"),
                            "author": conf.get("author")
                            })
        response = make_response(json.dumps(pipelines))
        response.headers['Content-Type'] = 'application/json'
        return response


    @app.route('/meta')
    def meta():
        global pipelineJob
        response = make_response(json.dumps(pipelineJob.meta()))
        response.headers['Content-Type'] = 'application/json'
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response


    @app.route('/gcode')
    def gcode():
        global pipelineJob
        response = make_response(pipelineJob.gcode(pipelineJob.filter_count()-1).to_string())
        response.headers['Content-Type'] = 'application/text'
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response


    @app.route('/image/<index>', methods=['GET'])
    def image(index):
        global previewImage
        global dataLock
        with dataLock:
            try:
                retval, buffer = cv2.imencode('.png', previewImage[int(index)]["image"])
                response = make_response(buffer.tobytes())
                response.headers['Content-Type'] = 'image/png'
                return response
            except:
                return make_response("temporarly unavailable", 503)


    @app.route('/machine/pendant/<axis>/<amount>/<speed>', methods=['POST'])
    def machine_pendant(axis, amount, speed):
        global dataLock
        global grbl
        with dataLock:
            try:
                grbl.send_line("$X")
                grbl.send_line("$J=G21 G91 {}{} F{}".format(axis,amount,speed))
                return make_response("ok", 200)
            except Exception as exc:
                print(exc)
                return make_response("temporally unavailable", 503)


    @app.route('/machine/probe/<depth>/<speed>', methods=['POST'])
    def machine_probe(depth, speed):
        global dataLock
        with dataLock:
            try:
                grbl.send_line("G38.2 Z{} F{}".format(depth,speed))
                return make_response("ok", 200)
            except Exception as exc:
                print(exc)
                return make_response("temporally unavailable", 503)


    @app.route('/machine/carve/start', methods=['POST'])
    def machine_carve_start():
        global pipelineJob
        global dataLock
        global millingThread
        with dataLock:
            try:
                # reset the work coordinate system to 0/0/0 before start milling.
                # The method expect the the user has already place the milling head and did probing
                #
                grbl.send_line("G10 P0 L20 X0 Y0 Z0")

                # start the thread and send the GCODE to the CNC machine
                #
                gcode = pipelineJob.gcode(pipelineJob.filter_count()-1)
                grbl.send(gcode)

                return make_response("ok", 200)
            except Exception as exc:
                print(exc)
                return make_response("temporally unavailable", 503)


    @app.route('/machine/milling/stop', methods=['POST'])
    def machine_carve_stop():
        global dataLock
        with dataLock:
            try:
                if millingThread:
                    millingThread.cancel()

                return make_response("ok", 200)
            except:
                return make_response("temporally unavailable", 503)


    @app.route('/parameter/<index>/<value>', methods=['POST'])
    def parameter(index, value):
        global pipelineJob
        global dataLock
        with dataLock:
            try:
                pipelineJob.set_parameter(int(index),int(value))
                return make_response("ok",200)
            except Exception as exc:
                print(exc)
                return make_response("temporally unavailable", 503)


    def interrupt():
        global jobThread
        global millingThread
        if jobThread:
            jobThread.cancel()
        if millingThread:
            millingThread.cancel()


    def processJob():
        global pipelineJob
        global previewImage
        global jobThread
        with dataLock:
            try:
                if pipelineJob:
                    previewImage = pipelineJob.process()
            except Exception as exc:
                print(exc)
                print("error during image processing...ignored")

        # Set the next thread to happen
        jobThread = threading.Timer(POOL_TIME, processJob, ())
        jobThread.start()

    def startJob():
        # Do initialisation stuff here
        global jobThread
        # Create your thread
        jobThread = threading.Timer(POOL_TIME, processJob, ())
        jobThread.start()

    # Initiate
    startJob()
    # When you kill Flask (SIGTERM), clear the trigger for the next thread
    atexit.register(interrupt)
    print("Running server on http://127.0.0.1:8080")
    ui.run()


create_app()
