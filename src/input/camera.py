import os
import cv2
from utils.videostream import VideoStream

CWD_PATH = os.path.dirname(os.path.realpath(__file__))


class Camera:
    def __init__(self):
        self.config_section = None
        self.conf_file = None
        self.icon = None
        self.zoom = 1

    def meta(self):
        return {
            "filter": self.config_section,
            "name":"Camera",
            "description":"Reads the image from your camera",
            "parameter": True,
            "value": self.zoom,
            "visible":True,
            "icon": self.icon
        }

    def configure(self, config_section, conf_file):
        self.config_section = config_section
        self.conf_file = conf_file
        self.capture = VideoStream(0)
        self.capture.start()

    def process(self, image, cnt, code):
        image = self.capture.read()

        return image, cnt, code

    def set_parameter(self, val):
        self.zoom = val
        self.conf_file.set("zoom", self.config_section, str(val))

