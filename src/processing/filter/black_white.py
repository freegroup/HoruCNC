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
            "name":"Black & White",
            "description":"Adjust until you see only the black sections your want carve",
            "parameters": [
                {
                    "name": "threshold",
                    "type": "slider",
                    "value": self.threshold
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
            (thresh, blackAndWhiteImage) = cv2.threshold(image, self.threshold, 255, cv2.THRESH_BINARY)
        except Exception as exc:
            print(self.conf_section, exc)

        return blackAndWhiteImage, cnt, code

    def set_parameter(self, name, val):
        self.threshold = int(val)
        self.conf_file.set("threshold", self.conf_section, str(val))


    def stop(self):
        pass
