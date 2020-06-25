import cv2

class Filter:
    def __init__(self):
        self.config_section = None
        self.conf_file = None
        self.icon = None

    def meta(self):
        return {
            "filter": self.config_section,
            "name":"grayscale",
            "description":"Grayscale a color image",
            "parameter": False,
            "visible":False,
            "icon": self.icon
        }

    def configure(self, config_section, conf_file):
        self.config_section = config_section
        self.conf_file = conf_file

    def process(self, image, cnt, code):

        image = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        # Make the grey scale image have three channels
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)

        return image, cnt, code