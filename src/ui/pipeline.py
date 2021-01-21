import utils.clazz as clazz

from utils.configuration import Configuration

import base64
import os.path
import inspect
import time
import sys
import os
import numpy as np

from utils.contour import ensure_3D_contour
from utils.exit import exit_process


class VideoPipeline:
    def __init__(self, pipeline_file):
        self.pipeline_conf = Configuration(pipeline_file)
        self.filters = []
        self.pipeline = self.pipeline_conf.sections()
        self.image = np.zeros((320, 320, 2), dtype="uint8")
        self.image.fill(255)

        # the input format for the first filter element
        input_format = None

        for pipeline_section in self.pipeline:
            # ignore the common section
            if pipeline_section == "common":
                continue
            # ignore the source section
            if pipeline_section == "source":
                continue

            instance = clazz.instance_by_name(pipeline_section)
            instance.configure(pipeline_section, self.pipeline_conf)
            instance.index = len(self.filters)

            # try to load an image/icon for the give filter
            python_file = inspect.getfile(instance.__class__)
            icon_file = python_file.replace(".py", ".png")
            if os.path.isfile(icon_file):
                instance.icon_path = icon_file

            # check that the output format if the predecessor filter matches with the input if this
            # filter
            meta = instance.meta()
            if not input_format==None and not meta["input"] == input_format:
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

    def filter(self, index):
        return self.filters[index]

    def filter_count(self):
        return len(self.filters)

    def set_image(self, image):
        self.image = image

    def get_image(self):
        return self.image

    def set_parameter(self, index, name, value):
        self.filters[index].set_parameter(name, value)

    def gcode(self, contour_3d):
        return self.filters[len(self.filters) - 1].gcode(contour_3d)

    def process(self):
        result = []
        image = self.image
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
