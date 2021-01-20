import cv2


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
            "output": "image",
            "icon": self.icon
        }

    def configure(self, conf_section, conf_file):
        self.conf_section = conf_section
        self.conf_file = conf_file
        self.threshold = self.conf_file.get_int("threshold", self.conf_section)

    def process(self, image, cnt):
        image = image.copy()
        (thresh, blackAndWhiteImage) = cv2.threshold(image, self.threshold, 255, cv2.THRESH_BINARY)

        return blackAndWhiteImage, cnt

    def set_parameter(self, name, val):
        self.threshold = int(val)
        self.conf_file.set("threshold", self.conf_section, str(val))
