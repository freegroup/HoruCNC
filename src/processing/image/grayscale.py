import cv2
from processing.filter import BaseFilter


class Filter(BaseFilter):
    def __init__(self, conf_section, conf_file):
        BaseFilter.__init__(self, conf_section, conf_file)

    def meta(self):
        return {
            "name": "Convert to Grayscale",
            "description": "Grayscale a color image",
            "parameters": [],
            "input": "image",
            "output": "image"
        }

    def _process(self, image, cnt):
        image = image.copy()
        image = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        # Make the grey scale image have three channels
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)

        return image, cnt
