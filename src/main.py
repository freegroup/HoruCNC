import cv2
import threading
import atexit
import sys
import json
from flask import Flask, render_template, make_response, send_from_directory

from pipeline import Pipeline

POOL_TIME = 0.5 #Seconds
PIPELINE_CONFIG =  sys.argv[1]

app = Flask(__name__)
pipeline = Pipeline(PIPELINE_CONFIG)

import logging
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
        global pipeline
        return render_template('index.html', filter_count=pipeline.filter_count())

    @app.route('/meta')
    def meta():
        global pipeline
        response = make_response(json.dumps(pipeline.meta()))
        response.headers['Content-Type'] = 'application/json'
        return response

    @app.route('/gcode/<index>')
    def gcode(index):
        global pipeline
        global dataLock
        with dataLock:
            try:
                gcode = pipeline.gcode(int(index))
                response = make_response(gcode,200)
                response.headers['Content-Type'] = 'application/txt'
                return response
            except Exception as exc:
                print(exc)
                return make_response("temporarly unavailable", 503)

    @app.route('/image/<index>', methods=['GET'])
    def input(index):
        global pipeline
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
                result = pipeline.process()
                previewImage = result
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

