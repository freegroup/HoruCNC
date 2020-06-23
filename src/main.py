import cv2
import threading
import atexit
from flask import Flask, render_template, make_response, send_from_directory

from pipeline import Pipeline
import json

POOL_TIME = 1 #Seconds

app = Flask(__name__)
pipeline = Pipeline("config/outline_gcode.ini")


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
        global pipelineThread
        with dataLock:
            retval, buffer = cv2.imencode('.png', previewImage[int(index)]["image"])
            response = make_response(buffer.tobytes())
            response.headers['Content-Type'] = 'image/png'
            return response

    def interrupt():
        global pipelineThread
        pipelineThread.cancel()

    def processPipeline():
        global previewImage
        global pipelineThread
        with dataLock:
            result = pipeline.process()
            previewImage = result
            print("step...")

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
app.run(debug=True)

