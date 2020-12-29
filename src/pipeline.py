import utils.clazz as clazz

from utils.configuration import Configuration

import base64
import os.path
import inspect
import time
import sys
import os

from utils.contour import ensure_3D_contour
from processing.source import ImageSource
from utils.exit import exit_process
from utils.perf import perf_tracker


class VideoPipeline:
    def __init__(self, global_conf, pipeline_file):
        self.pipeline_conf = Configuration(pipeline_file)
        self.filters = []
        self.pipeline = self.pipeline_conf.sections()
        self.source = ImageSource()
        self.source.configure(global_conf, "source", self.pipeline_conf)
        # the input format for the first filter element
        input_format = "image"

        for pipeline_section in self.pipeline:
            print(pipeline_section)
            # ignore the common section
            if pipeline_section == "common":
                continue
            # ignore the source section
            if pipeline_section == "source":
                continue

            instance = clazz.instance_by_name(pipeline_section)
            instance.configure(global_conf, pipeline_section, self.pipeline_conf)
            # try to load an image/icon for the give filter
            python_file = inspect.getfile(instance.__class__)
            svg_file = python_file.replace(".py", ".svg")
            if os.path.isfile(svg_file):
                with open(svg_file, "rb") as image_file:
                    encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                    instance.icon = "data:image/svg+xml;base64," + encoded_string

            # check that the output format if the predecessor filter matches with the input if this
            # filter
            meta = instance.meta()
            if not meta["input"] == input_format:
                print("Filter '{}' is unable to process input format '{}'. Expected was '{}'".format(python_file, input_format, meta["input"]))
                print("Wrong pipeline definition. Exit")
                exit_process()

            # the output if this filter is the input of the next filter
            input_format = meta["output"]

            self.filters.append(instance)

    def meta(self):
        meta_info = []
        for instance in self.filters:
            menu = self.pipeline_conf.get_boolean("menu", instance.conf_section)
            meta = instance.meta()
            meta["menu"] = menu
            meta_info.append(meta)
        return {
            "name": self.pipeline_conf.get("name"),
            "description": self.pipeline_conf.get("description"),
            "author": self.pipeline_conf.get("author"),
            "filters": meta_info
        }

    def filter_count(self):
        return len(self.filters)

    def override_source_image(self, value):
        self.source.set_image(value)

    def get_source_image(self):
        return self.source.get_image()

    def set_parameter(self, index, name, value):
        self.filters[index].set_parameter(name, value)

    @perf_tracker()
    def gcode(self, contour_3d):
        return self.filters[len(self.filters) - 1].gcode(contour_3d)

    def process(self):
        result = []
        image = self.get_source_image()
        cnt = []

        for instance in self.filters:
            start = time.process_time()
            try:
                print("Running filter: ", type(instance))
                image, cnt = instance.process(image, cnt)
                end = time.process_time()
                print(instance.meta()["name"], end - start)
                print("Contour Count:", len(cnt))
                cnt = ensure_3D_contour(cnt)
                if image is None:
                    print("unable to read image from filter: " + instance.meta()["name"])
                    break
                if len(image.shape) != 3:
                    print("Image must have 3 color channels. Filter '{}' must return RGB image for further processing".format(instance.conf_section))
                result.append({"filter": instance.conf_section, "image": image, "contour": cnt})
                print("------------------------")
            except Exception as exc:
                exc_type, exc_obj, exc_tb = sys.exc_info()
                fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
                print(exc_type, fname, exc_tb.tb_lineno)
                print(type(instance), exc)

        return result

    def stop(self):
        for instance in self.filters:
            instance.stop()
