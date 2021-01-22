import cv2
from processing.filter import BaseFilter


class Filter(BaseFilter):
    def __init__(self, conf_section, conf_file):
        BaseFilter.__init__(self, conf_section, conf_file)
        self.slider_max = 255
        self.threshold = self.conf_file.get_int("threshold", self.conf_section)

    def meta(self):
        return {
            "name": "Black & White",
            "description": "Converts the image to black&white by a given threshold",
            "parameters": [
                {
                    "name": "threshold",
                    "label": "Threshold",
                    "type": "slider",
                    "min": 1,
                    "max": "255",
                    "value": self.threshold
                }
            ],
            "input": "image",
            "output": "image"
        }

    def _process(self, image, cnt):
        image = image.copy()
        (thresh, blackAndWhiteImage) = cv2.threshold(image, self.threshold, 255, cv2.THRESH_BINARY)

        return blackAndWhiteImage, cnt

    def set_parameter(self, name, val):
        self.threshold = int(val)
        self.conf_file.set("threshold", self.conf_section, str(val))
