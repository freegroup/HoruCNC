import cv2
import numpy as np


class Filter:
    def __init__(self):
        self.conf_section = None
        self.conf_file = None
        self.icon = None

    def meta(self):
        return {
            "filter": self.conf_section,
            "name": "Outline",
            "description": "Calculates the shape outlines of an black&white image",
            "parameters": [],
            "input": "image",
            "output": "image",
            "icon": self.icon
        }

    def configure(self, conf_section, conf_file):
        self.conf_section = conf_section
        self.conf_file = conf_file

    def process(self, image, cnt):
        image = image.copy()
        kernel = np.ones((3, 3), np.uint8)

        # remove white single pixels
        image = cv2.morphologyEx(image, cv2.MORPH_OPEN, kernel)

        # outline
        image = cv2.morphologyEx(image, cv2.MORPH_GRADIENT, kernel)

        return (255 - image), cnt
