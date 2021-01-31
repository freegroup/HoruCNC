import cv2
from processing.filter import BaseFilter


class Filter(BaseFilter):
    def __init__(self, conf_section, conf_file):
        BaseFilter.__init__(self, conf_section, conf_file)
        self.slider_max = 100
        self.factor = self.conf_file.get_int("factor", self.conf_section)

    def meta(self):
        return {
            "name": "Blur",
            "description": "Remove noise from the image and smooth it",
            "parameters": [
                {
                    "name": "threshold",
                    "label": "Threshold",
                    "type": "slider",
                    "min": 1,
                    "max": "255",
                    "value": self.factor
                }
            ],
            "input": "image",
            "output": "image"
        }

    def _process(self, image, cnt):
        image = image.copy()
        kernel = max(3, int((19 / 255 * self.factor) / 2) * 2 + 1)
        blur = cv2.blur(image, (kernel, kernel))
        return blur, cnt

    def _set_parameter(self, name, val):
        self.factor = int(val)
        self.conf_file.set("factor", self.conf_section, str(self.factor))
