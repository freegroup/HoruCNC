import cv2
import numpy as np
from processing.filter import BaseFilter


class Filter(BaseFilter):
    def __init__(self, conf_section, conf_file):
        BaseFilter.__init__(self, conf_section, conf_file)
        self.slider_max = 255
        self.threshold = self.conf_file.get_int("threshold", self.conf_section)

    def meta(self):
        return {
            "name": "CannyEdge",
            "description": "Calculates the edge with a given threshold",
            "parameters": [
                {
                    "name": "threshold",
                    "label": "Threshold",
                    "type": "slider",
                    "min": 1,
                    "max": "255",
                    "value": self.threshold,
                }
            ],
            "input": "image",
            "output": "image"
        }

    def _process(self, image, cnt):
        image = image.copy()
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)

        sigma = 1 / 255 * self.threshold  # 0.33
        v = np.median(image)
        # apply automatic Canny edge detection using the computed median
        lower = int(max(0, (1.0 - sigma) * v))
        upper = int(min(255, (1.0 + sigma) * v))
        edged = cv2.Canny(blurred, lower, upper)
        edged = 255 - cv2.cvtColor(edged, cv2.COLOR_GRAY2BGR)

        return edged, cnt

    def set_parameter(self, name, val):
        self.threshold = int(val)
        self.conf_file.set("threshold", self.conf_section, str(val))
