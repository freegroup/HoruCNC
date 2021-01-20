import click
import os.path
import utils.clazz as clazz
import cv2
import json
import base64

from utils.image import image_resize
from utils.exit import exit_process
from utils.configuration import Configuration
from utils.contour import ensure_3D_contour


def validate_image(ctx, param, value):
    if not value or not os.path.isfile(value):
        raise click.BadParameter("Must be a valid image")
    return value

def validate_pipeline(ctx, param, value):
    if not value or not os.path.isfile(value):
        raise click.BadParameter("Must be a valid processing pipeline")
    return value

def process(image, pipeline):
    """Converts Images into GCode by a given 'pipeline'"""
    pipeline_conf = Configuration(pipeline)
    pipeline_sections = pipeline_conf.sections()
    configuration_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "config", "configuration.ini"))
    global_conf = Configuration(configuration_dir)

    input_format = "image"

    result = []

    img = cv2.imread(image, cv2.IMREAD_COLOR)
    img = image_resize(img, height=600)
    cnt = None

    result.append({"filter": "source",
                   "image": img,
                   "contour": cnt,
                   "name": "Image Source",
                   "description": "Original Image without any modification"
                   })
    for pipeline_section in pipeline_sections:
        # ignore the common section
        if pipeline_section == "common":
            continue
        # ignore the source section
        if pipeline_section == "source":
            continue

        instance = clazz.instance_by_name(pipeline_section)
        instance.configure(pipeline_section, pipeline_conf)

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
        result.append({
            "filter": pipeline_section,
            "image": img,
            "parameters": meta["parameters"],
            "name": meta["name"],
            "description": meta["description"],
            "contour": cnt
        })

    gcode = instance.gcode(cnt).to_string()
    return result, gcode


@click.group()
def cli():
    pass


@cli.command()
@click.option("--image", "-i",    help="The image to convert",           callback=validate_image)
@click.option("--pipeline", "-p", help="The processing pipeline to use", callback=validate_pipeline)
def preview(image, pipeline):
    """Preview the GCODE in a preview window"""
    filter_results, gcode = process(image, pipeline)
    gcode = "var gcode_data= `"+gcode+"`;"
    gcode_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "static", "assets", "gcode_data.js"))
    with open(gcode_file, 'w', encoding='utf-8') as f:
        f.write(gcode)
    click.launch('./src/static/html/preview.html')


@cli.command()
@click.option("--image", "-i",    help="The image to convert",           callback=validate_image)
@click.option("--pipeline", "-p", help="The processing pipeline to use", callback=validate_pipeline)
def generate(image, pipeline):
    """Output the GCODE to the console"""
    filter_results, gcode = process(image, pipeline)
    print(gcode)


@cli.command()
@click.option("--image", "-i",    help="The image to convert",           callback=validate_image)
@click.option("--pipeline", "-p", help="The processing pipeline to use", callback=validate_pipeline)
def debug(image, pipeline):
    """Shows the conversion steps in an HTML-page"""
    filter_results, gcode = process(image, pipeline)
    meta_data = []
    for r in filter_results:
        retval, buffer = cv2.imencode('.png', r["image"])
        r["image"] = 'data:image/png;base64,' + base64.b64encode( buffer.tobytes()).decode()
        del r["contour"]
        meta_data.append(r)
    filter_results = "var trace_data= "+json.dumps(meta_data, indent=2)+";"
    gcode_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "static", "assets", "trace_data.js"))
    with open(gcode_file, 'w', encoding='utf-8') as f:
        f.write(filter_results)
    click.launch('./src/static/html/trace.html')



if __name__ == '__main__':
    cli()
