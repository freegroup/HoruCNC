import cv2
import threading
import atexit
from flask import Flask, render_template, make_response, send_from_directory

from pipeline import Pipeline
import json

POOL_TIME = 0.5 #Seconds

app = Flask(__name__)
pipeline = Pipeline("config/outline_gcode.ini")

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
        return render_template('index.html', filter_count=pipeline.filter_count())

    @app.route('/meta')
    def meta():
        response = make_response(json.dumps(pipeline.meta()))
        response.headers['Content-Type'] = 'application/json'
        return response

    @app.route('/image/<index>', methods=['GET'])
    def input(index):
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
        global previewImage
        global pipelineThread
        with dataLock:
            try:
                result = pipeline.process()
                previewImage = result
            except:
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
app.run(host="0.0.0.0", port=8080, debug=True)

