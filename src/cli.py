import click
import os.path
import utils.clazz as clazz
import cv2
from utils.image import image_resize
from utils.exit import exit_process
from utils.configuration import Configuration
from utils.contour import ensure_3D_contour
from flask import Flask, render_template, make_response, send_file, request
from utils.webgui import FlaskUI  # get the FlaskUI class


def validate_image(ctx, param, value):
    if not value or not os.path.isfile(value):
        raise click.BadParameter("Must be a valid image")
    return value

def validate_pipeline(ctx, param, value):
    if not value or not os.path.isfile(value):
        raise click.BadParameter("Must be a valid processing pipeline")
    return value


@click.command()
@click.option("--preview",  help="Previews the generated GCode in a browser window", default=False,  is_flag=True)
@click.option("--image",    help="The image to convert",           callback=validate_image)
@click.option("--pipeline", help="The processing pipeline to use", callback=validate_pipeline)
def convert(preview, image, pipeline):
    """Converts Images into GCode by a given 'pipeline'"""
    pipeline_conf = Configuration(pipeline)
    pipeline_sections = pipeline_conf.sections()
    configuration_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "config", "configuration.ini"))
    global_conf = Configuration(configuration_dir)

    input_format = "image"

    img = cv2.imread(image, cv2.IMREAD_COLOR)
    img = image_resize(img, height=600)
    cnt = None

    for pipeline_section in pipeline_sections:
        # ignore the common section
        if pipeline_section == "common":
            continue
        # ignore the source section
        if pipeline_section == "source":
            continue

        instance = clazz.instance_by_name(pipeline_section)
        instance.configure(global_conf, pipeline_section, pipeline_conf)

        # check that the output format if the predecessor filter matches with the input if this
        # filter
        meta = instance.meta()
        if not meta["input"] == input_format:
            print("Filter '{}' is unable to process input format '{}'. Expected was '{}'".format(python_file, input_format, meta["input"]))
            print("Wrong pipeline definition. Exit")
            exit_process()

        # the output if this filter is the input of the next filter
        input_format = meta["output"]
        img, cnt = instance.process(img, cnt)
        cnt = ensure_3D_contour(cnt)

    if(preview):
        gcode = instance.gcode(cnt).to_string()
        gcode_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "static", "assets", "preview.nc"))
        with open(gcode_file, 'w', encoding='utf-8') as f:
            f.write(gcode)

        app = Flask(__name__)
        app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
        ui = FlaskUI(app=app, port=8080)
        @app.route('/')
        def index():
            return send_file('static/html/preview.html', cache_timeout=-1)

        ui.run()
    else:
        print(instance.gcode(cnt).to_string())


if __name__ == '__main__':
    convert()
