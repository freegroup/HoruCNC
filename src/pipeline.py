import utils.clazz as clazz

from utils.configuration import Configuration

import base64
import os.path
import inspect
from processing.source.dual import ImageSource

class VideoPipeline:
    def __init__(self, global_conf, pipeline_file ):
        self.pipeline_conf = Configuration(pipeline_file)
        self.filters = []
        self.pipeline = self.pipeline_conf.sections()
        self.source = ImageSource()
        self.source.configure(global_conf, "source", self.pipeline_conf)

        for pipeline_section in self.pipeline:
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
            "filters":meta_info
        }


    def filter_count(self):
        return len(self.filters)


    def override_source_image(self, value):
        self.source.set_image(value)


    def get_source_image(self):
        return self.source.get_image()


    def set_parameter(self, index, name, value):
        self.filters[index].set_parameter(name, value)


    def gcode(self, index):
        return self.filters[index].gcode()

    def process(self):
        result = []
        image ,cnt , gcode = self.source.process(None, None, None)

        for instance in self.filters:
            image, cnt, gcode = instance.process(image, cnt, gcode)
            if image is None:
                print("unable to read image from filter: "+instance.meta()["name"])
                break
            if len(image.shape) != 3:
                print("Image must have 3 color channels. Filter '{}' must return RGB image for further processing".format(instance.conf_section))
            result.append({"filter": instance.conf_section, "image":image, "contour": cnt, "gcode": gcode})

        return result

    def stop(self):
        for instance in self.filters:
            instance.stop()
