import cv2
import numpy as np


class Filter:
    def __init__(self):
        self.conf_section = None
        self.conf_file = None
        self.icon = None
        self.white = 0
        self.black = 0

    def meta(self):
        return {
            "filter": self.conf_section,
            "name": "Truncate",
            "description": "Truncate the upper and lower values of gray and make them pure black and white",
            "parameters": [
                {
                    "name": "white",
                    "label": "White",
                    "type": "slider",
                    "min": 1,
                    "max": "255",
                    "value": self.white,
                },
                {
                    "name": "black",
                    "label": "Black",
                    "type": "slider",
                    "min": 1,
                    "max": "255",
                    "value": self.black,
                }
            ],
            "input": "image",
            "output": "image",
            "icon": self.icon
        }

    def configure(self, conf_section, conf_file):
        self.conf_section = conf_section
        self.conf_file = conf_file

    def process(self, image, cnt):
        invert_white = 255 - self.white
        image = np.where(image > invert_white, 255, image)
        image = np.where(image < self.black, 0, image)
        return image, cnt

    def set_parameter(self, name, val):
        if name == "white":
            self.white = int(val)
        if name == "black":
            self.black = int(val)

