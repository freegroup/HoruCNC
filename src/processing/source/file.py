import os
import cv2
from utils.image import image_resize
from processing.filter import BaseFilter


from utils.configuration import Configuration
conf = Configuration("resources/config/configuration.ini")

class Filter(BaseFilter):
    def __init__(self, conf_section, conf_file):
        BaseFilter.__init__(self, conf_section, conf_file)
        self.path = conf.get("path","common")
        if not os.access(self.path, os.R_OK):
            self.path="resources/default-image.png"

    def meta(self):
        return {
            "name": "Select Image",
            "description": "Select the Input Image to process",
            "parameters": [
                {
                    "name": "path",
                    "label": "File",
                    "type": "string",
                    "value": self.path
                }
            ],
            "input": "filepicker",
            "output": "image"
        }

    def _process(self, image, cnt):
        if self.path:
            image = cv2.imread(self.path, cv2.IMREAD_COLOR)
            image = image_resize(image, height=600)

        return image, cnt

    def _set_parameter(self, name, val):
        self.path = val
        conf.set(name, "common", val)

