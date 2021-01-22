import cv2
import numpy as np
from processing.filter import BaseFilter


class Filter(BaseFilter):
    def __init__(self, conf_section, conf_file):
        BaseFilter.__init__(self, conf_section, conf_file)

    def meta(self):
        return {
            "name": "Outline",
            "description": "Calculates the shape outlines of an black&white image",
            "parameters": [],
            "input": "image",
            "output": "image"
        }

    def _process(self, image, cnt):
        image = image.copy()
        kernel = np.ones((3, 3), np.uint8)

        # remove white single pixels
        image = cv2.morphologyEx(image, cv2.MORPH_OPEN, kernel)

        # outline
        image = cv2.morphologyEx(image, cv2.MORPH_GRADIENT, kernel)

        return (255 - image), cnt
