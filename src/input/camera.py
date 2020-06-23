import os
import cv2
from utils.videostream import VideoStream

CWD_PATH = os.path.dirname(os.path.realpath(__file__))


class Camera:
    def __init__(self):
        self.config_section = None
        self.conf_file = None

    def meta(self):
        return {
            "filter": self.config_section,
            "name":"Camera",
            "description":"Reads the image from your camera",
            "params": []
        }

    def configure(self, config_section, conf_file):
        self.config_section = config_section
        self.conf_file = conf_file
        self.capture = VideoStream(0)
        self.capture.start()

    def process(self, image, cnt, code):
        image = self.capture.read()

        return image, cnt, code