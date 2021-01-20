import cv2


class Filter:
    def __init__(self):
        self.conf_section = None
        self.conf_file = None
        self.icon = None

    def meta(self):
        return {
            "filter": self.conf_section,
            "name": "grayscale",
            "description": "Grayscale a color image",
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
        image = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        # Make the grey scale image have three channels
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)

        return image, cnt
