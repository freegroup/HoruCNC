import utils.clazz as clazz

from utils.configuration import Configuration

import base64
import os.path
import inspect

class VideoPipeline:
    def __init__(self, global_conf, pipeline_file ):
        self.pipeline_conf = Configuration(pipeline_file)
        self.filters = []
        self.pipeline = self.pipeline_conf.sections()
        for pipeline_section in self.pipeline:
            # ignore the common section
            if pipeline_section == "common":
                continue

            instance = clazz.instance_by_name(pipeline_section)
            instance.configure(global_conf, pipeline_section, self.pipeline_conf)
            # try to load an image/icon for the give filter
            python_file = inspect.getfile(instance.__class__)
            svg_file = python_file.replace(".py", ".svg")
            if os.path.isfile(svg_file):
                with open(svg_file, "rb") as image_file:
                    encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                    instance.icon = "data:image/svg+xml;base64,"+encoded_string

            self.filters.append(instance)

    def meta(self):
        meta_info = []
        for instance in self.filters:
            menu = self.pipeline_conf.get_boolean("menu", instance.conf_section)
            meta  =instance.meta()
            meta["menu"]= menu
            meta_info.append(meta)
        return {
            "name":self.pipeline_conf.get("name"),
            "description":self.pipeline_conf.get("description"),
            "author":self.pipeline_conf.get("author"),
            "output":self.pipeline_conf.get("output"),
            "filters":meta_info
        }


    def filter_count(self):
        return len(self.filters)

    def set_parameter(self, index, value):
        self.filters[index].set_parameter(value)

    def gcode(self, index):
        return self.filters[index].gcode()

    def process(self):
        result = []
        image = None
        cnt = None
        gcode = None
        for instance in self.filters:
            image, cnt, gcode = instance.process(image, cnt, gcode)
            if image is None:
                print("unable to read image from camera")
                break
            result.append({"filter": instance.conf_section, "image":image, "contour": cnt, "gcode": gcode})

        return result

    def stop(self):
        for instance in self.filters:
            instance.stop()
