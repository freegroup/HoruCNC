import cv2


class Filter:
    def __init__(self):
        self.slider_max = 100
        self.factor = 75
        self.conf_section = None
        self.conf_file = None
        self.icon = None

    def meta(self):
        return {
            "filter": self.conf_section,
            "name": "Blur",
            "description": "Remove noise from the image",
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
            "output": "image",
            "icon": self.icon
        }

    def configure(self, conf_section, conf_file):
        self.conf_section = conf_section
        self.conf_file = conf_file
        self.factor = self.conf_file.get_int("factor", self.conf_section)

    def process(self, image, cnt):
        image = image.copy()
        image = cv2.bilateralFilter(image, 9, self.factor, self.factor)

        return image, cnt

    def set_parameter(self, name, val):
        self.factor = int(val)
        self.conf_file.set("factor", self.conf_section, str(self.factor))
