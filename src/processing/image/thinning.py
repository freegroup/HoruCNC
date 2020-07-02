import cv2

class Filter:
    def __init__(self):
        self.conf_section = None
        self.conf_file = None
        self.icon = None

    def meta(self):
        return {
            "filter": self.conf_section,
            "name":"Thinning",
            "description":"Thinning the outline of the found contour",
            "parameter": False,
            "icon": self.icon
        }

    def configure(self, global_conf, conf_section, conf_file):
        self.conf_section = conf_section
        self.conf_file = conf_file

    def process(self, image, cnt, code):
        try:
            image = image.copy()
            single_channel =  cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            print(single_channel.shape)
            image = cv2.ximgproc.thinning(single_channel)
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        except Exception as exc:
            print(exc)

        return image, cnt, code

    def stop(self):
        pass

