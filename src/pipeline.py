import utils.clazz as clazz

from utils.configuration import Configuration
import base64
import os.path
import inspect

class Pipeline:
    def __init__(self, config_file ):
        print("init pipeline")
        self.conf = Configuration(config_file)
        self.filters = []
        self.pipeline = self.conf.sections()
        for filter in self.pipeline:
            # ignore the common section
            if filter == "common":
                continue

            print(filter)
            instance = clazz.instance_by_name(filter)
            instance.configure(filter, self.conf)
            # try to load an image/icon for the give filter
            python_file = inspect.getfile(instance.__class__)
            png_file = python_file.replace(".py", ".png")
            if os.path.isfile(png_file):
                with open(png_file, "rb") as image_file:
                    encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                    instance.icon = encoded_string
            self.filters.append(instance)

    def meta(self):
        meta_info = []
        for instance in self.filters:
            menu = self.conf.get_boolean("menu", instance.config_section)
            meta  =instance.meta()
            meta["menu"]= menu
            meta_info.append(meta)
        return meta_info

    def filter_count(self):
        return len(self.pipeline)

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
            result.append({"filter": instance.config_section, "image":image, "contour": cnt, "gcode": gcode})

        return result

    def stop(self):
        for instance in self.filters:
            instance.stop()
