import cv2
import numpy as np



class Filter:
    def __init__(self):
        self.slider_max = 100
        self.factor = 75
        self.config_section = None
        self.conf_file = None
        self.icon = None

    def meta(self):
        return {
            "filter": self.config_section,
            "name":"Blur",
            "description":"Remove noise from the image",
            "parameter": True,
            "value": self.factor,
            "icon": self.icon
        }

    def configure(self, config_section, conf_file):
        self.config_section = config_section
        self.conf_file = conf_file
        self.factor = self.conf_file.get_int("factor", self.config_section)

    def process(self, image, cnt, code):
        try:
            image = image.copy()
            image = cv2.bilateralFilter(image,9,self.factor,self.factor)
        except Exception as exc:
            print(self.config_section, exc)


        return image, cnt, code

    def set_parameter(self, val):
        self.factor = val
        self.conf_file.set("factor", self.config_section, str(self.factor))


    def stop(self):
        pass

