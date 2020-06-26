import cv2


class Filter:
    def __init__(self):
        self.slider_max = 255
        self.threshold = 75
        self.config_section = None
        self.conf_file = None
        self.icon = None

    def meta(self):
        return {
            "filter": self.config_section,
            "name":"Black & White",
            "description":"Adjust the slider until you see only the parts your want carve",
            "parameter": True,
            "value": self.threshold,
            "visible":True,
            "icon": self.icon
        }

    def configure(self, config_section, conf_file):
        self.config_section = config_section
        self.conf_file = conf_file
        self.threshold = self.conf_file.get_int("threshold", self.config_section)

    def process(self, image, cnt, code):
        try:
            image = image.copy()
            (thresh, blackAndWhiteImage) = cv2.threshold(image, self.threshold, 255, cv2.THRESH_BINARY)
            cv2.imwrite("bw.png", blackAndWhiteImage)
        except Exception as exc:
            print(self.config_section, exc)

        return blackAndWhiteImage, cnt, code

    def set_parameter(self, val):
        self.threshold = val
        self.conf_file.set("threshold", self.config_section, str(val))

