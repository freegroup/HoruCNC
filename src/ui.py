import cv2
import threading
import atexit
import json
import logging
import os
import base64

from flask import Flask, render_template, make_response, send_file, request

from utils.webgui import FlaskUI  # get the FlaskUI class

from processing.pipeline import VideoPipeline
from grbl.sender import GrblWriter
from utils.configuration import Configuration

try:
    configuration_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "config", "configuration.ini"))
    conf = Configuration(configuration_dir)

    POOL_TIME = conf.get_int("image-read-ms") / 1000  # convert to Seconds
    PIPELINE_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), conf.get("pipelines")))
    SERIAL_PORT = conf.get("serial-port")
    SERIAL_BAUD = conf.get_int("serial-baud")

    grbl = GrblWriter(SERIAL_PORT, SERIAL_BAUD)

    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)

    app = Flask(__name__)
    app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
    ui = FlaskUI(app=app, port=8080)

    # global, thread base variables
    pipelineResults = None  # the result of each pipeline run
    dataLock = threading.Lock()  # sync the access to "pipelineResults" of the different thread
    pipelineJob = None  # the current, selected pipeline for image processing
    jobThread = None  # runs the pipeline
    millingThread = None  # runs the milling job
except Exception as exc:
    exc_type, exc_obj, exc_tb = sys.exc_info()
    fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
    print(exc_type, fname, exc_tb.tb_lineno)

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
            pipelineJob = VideoPipeline(conf, PIPELINE_FOLDER + "/" + name + ".ini")
            return send_file('static/html/pipeline.html', cache_timeout=-1)

    @app.route('/pipelines')
    def pipelines():
        from os import listdir
        from os.path import isfile, join, basename, splitext
        onlyfiles = [join(PIPELINE_FOLDER, f) for f in listdir(PIPELINE_FOLDER) if isfile(join(PIPELINE_FOLDER, f))]
        pipelines = []
        for f in onlyfiles:
            if not f.endswith(".ini"):
                continue
            conf = Configuration(f)

            pipeline_metadata = {
                "basename": splitext(basename(f))[0],
                "name": conf.get("name"),
                "description": conf.get("description"),
                "author": conf.get("author")
            }

            svg_file = f.replace(".ini", ".svg")
            if os.path.isfile(svg_file):
                with open(svg_file, "rb") as image_file:
                    encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                    pipeline_metadata["icon"] = "data:image/svg+xml;base64," + encoded_string

            pipelines.append(pipeline_metadata)

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
        global pipelineResults
        if pipelineResults is None:
            return make_response("not found", 404)

        index = pipelineJob.filter_count() - 1
        if (index + 1) > len(pipelineResults):
            return make_response("not found", 404)

        result = pipelineResults[index]
        if "contour" not in result:
            return make_response("not found", 404)

        contour_3d = result["contour"]
        response = make_response(pipelineJob.gcode(contour_3d).to_string())
        print("===============================================================================================")
        response.headers['Content-Disposition'] = 'attachment; filename="carve.gcode"; filename*="carve.gcode"'
        response.headers['Content-Type'] = 'application/text'
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response

    @app.route('/image/<index>', methods=['GET'])
    def image(index):
        global pipelineResults
        global dataLock
        with dataLock:
            try:
                retval, buffer = cv2.imencode('.png', pipelineResults[int(index)]["image"])
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
                amount = float(amount)
                speed = float(speed)
                if amount == 0 or speed == 0:
                    return make_response("ok", 200)

                grbl.send_line("\x85")
                grbl.send_line("$J=G21 G91 {}{} F{}".format(axis, amount, speed))
                print("done")
                return make_response("ok", 200)
            except Exception as exc:
                print(exc)
                return make_response("temporally unavailable", 503)

    @app.route('/machine/reset', methods=['POST'])
    def machine_reset():
        global dataLock
        global grbl
        with dataLock:
            try:
                grbl.send_line("\x85")
                grbl.send_line("$X")
                return make_response("ok", 200)
            except Exception as exc:
                print(exc)
                return make_response("temporally unavailable", 503)

    @app.route('/machine/probe/<depth>/<speed>', methods=['POST'])
    def machine_probe(depth, speed):
        global dataLock
        with dataLock:
            try:
                grbl.send_line("G38.2 Z{} F{}".format(depth, speed))
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
                gcode = pipelineJob.gcode(pipelineJob.filter_count() - 1)
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

    @app.route('/parameter/<index>/<name>/<value>', methods=['POST'])
    def parameter(index, name, value):
        global pipelineJob
        global dataLock
        with dataLock:
            try:
                pipelineJob.set_parameter(int(index), name, value)
                return make_response("ok", 200)
            except Exception as exc:
                print(exc)
                return make_response("temporally unavailable", 503)

    @app.route('/sourceImage', methods=['POST'])
    def sourceImagePost():
        global pipelineJob
        try:
            if len(request.data) == 0:
                pipelineJob.override_source_image(None)
            else:
                value = request.data.decode("utf-8")
                pipelineJob.override_source_image(value)
            return make_response("ok", 200)
        except Exception as exc:
            print(exc)
            return make_response("temporally unavailable", 503)

    @app.route('/sourceImage', methods=['GET'])
    def sourceImageGet():
        global pipelineJob
        try:
            retval, buffer = cv2.imencode('.png', pipelineJob.get_source_image())
            response = make_response(buffer.tobytes())
            response.headers['Content-Type'] = 'image/png'
            return response
        except Exception as exc:
            print(exc)
            return make_response("temporally unavailable", 503)

    def interrupt():
        global jobThread
        global millingThread
        if jobThread:
            print("cancel jobThread")
            jobThread.cancel()
        if millingThread:
            print("cancel millingThread")
            millingThread.cancel()

    def processJob():
        global pipelineJob
        global pipelineResults
        global jobThread
        with dataLock:
            try:
                if pipelineJob:
                    pipelineResults = pipelineJob.process()
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
        print("start jobThread")
        jobThread = threading.Timer(POOL_TIME, processJob, ())
        jobThread.start()

    # Initiate
    startJob()
    # When you kill Flask (SIGTERM), clear the trigger for the next thread
    atexit.register(interrupt)
    print("Running server on http://127.0.0.1:8080")
    ui.run()


if __name__ == "__main__":
    create_app()
