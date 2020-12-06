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
            "name":"Blur",
            "description":"Remove noise from the image and smooth it",
            "parameters": [
                {
                    "name": "threshold",
                    "type": "slider",
                    "value": self.factor
                }
            ],
            "icon": self.icon
        }

    def configure(self, global_conf, conf_section, conf_file):
        self.conf_section = conf_section
        self.conf_file = conf_file
        self.factor = self.conf_file.get_int("factor", self.conf_section)

    def process(self, image, cnt, code):
        try:
            image = image.copy()
            kernel = max(3, int((19 /255*self.factor)/2)*2+1 )
            print(kernel)
            blur = cv2.blur(image,(kernel,kernel))
        except Exception as exc:
            print(self.conf_section, exc)


        return blur, cnt, code

    def set_parameter(self, name, val):
        self.factor = int(val)
        self.conf_file.set("factor", self.conf_section, str(self.factor))


    def stop(self):
        pass

