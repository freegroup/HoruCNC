import cv2
from utils.image import image_resize


class Filter:
    def __init__(self):
        self.conf_section = None
        self.conf_file = None
        self.icon = None
        self.path = None

    def meta(self):
        return {
            "filter": self.conf_section,
            "name": "Input Image",
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
            "output": "image",
            "icon": self.icon
        }

    def configure(self, conf_section, conf_file):
        self.conf_section = conf_section
        self.conf_file = conf_file
        self.path = self.conf_file.get("path", self.conf_section)

    def process(self, image, cnt):
        if self.path:
            image = cv2.imread(self.path, cv2.IMREAD_COLOR)
            image = image_resize(image, height=600)

        return image, cnt

    def set_parameter(self, name, val):
        self.path = val
        self.conf_file.set(name, self.conf_section, val)

