
import numpy as np
from processing.filter import BaseFilter


class Filter(BaseFilter):
    def __init__(self, conf_section, conf_file):
        BaseFilter.__init__(self, conf_section, conf_file)
        self.white = 0
        self.black = 0

    def meta(self):
        return {
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
            "output": "image"
        }

    def _process(self, image, cnt):
        invert_white = 255 - self.white
        image = np.where(image > invert_white, 255, image)
        image = np.where(image < self.black, 0, image)
        return image, cnt

    def _set_parameter(self, name, val):
        if name == "white":
            self.white = int(val)
        if name == "black":
            self.black = int(val)

