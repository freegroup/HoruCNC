import cv2
import numpy as np

class Filter:
    def __init__(self):
        self.slider_max = 255
        self.threshold = 75
        self.conf_section = None
        self.conf_file = None
        self.icon = None

    def meta(self):
        return {
            "filter": self.conf_section,
            "name":"EdgeArt",
            "description":"Adjust until you see only the edges your want carve",
            "parameters": [
                {
                    "name": "threshold",
                    "label": "Threshold",
                    "type": "slider",
                    "value": self.threshold,
                }
            ],
            "icon": self.icon
        }

    def configure(self, global_conf, conf_section, conf_file):
        self.conf_section = conf_section
        self.conf_file = conf_file
        self.threshold = self.conf_file.get_int("threshold", self.conf_section)


    def process(self, image, cnt, code):
        try:
            image = image.copy()
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)

            sigma = 1/255 * self.threshold # 0.33
            v = np.median(image)
            # apply automatic Canny edge detection using the computed median
            lower = int(max(0, (1.0 - sigma) * v))
            upper = int(min(255, (1.0 + sigma) * v))
            edged = cv2.Canny(blurred, lower, upper)
            edged = 255 - cv2.cvtColor(edged, cv2.COLOR_GRAY2BGR)

        except Exception as exc:
            print(self.conf_section, exc)

        return edged, cnt, code


    def set_parameter(self, name, val):
        self.threshold = int(val)
        self.conf_file.set("threshold", self.conf_section, str(val))


    def stop(self):
        pass

