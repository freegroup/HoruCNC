import cv2
import numpy as np

class Filter:
    def __init__(self):
        self.conf_section = None
        self.conf_file = None
        self.icon = None

    def meta(self):
        return {
            "filter": self.conf_section,
            "name":"Contours",
            "description":"Generates the contour of your outline image",
            "parameter": None,
            "icon": self.icon
        }

    def configure(self, global_conf, conf_section, conf_file):
        self.conf_section = conf_section
        self.conf_file = conf_file

    def process(self, image, cnt, code):
        try:
            if len(image.shape)==2:
                print("Error: Input shape for 'to_contour' mist be three channel images")

            outline = np.zeros(image.shape, dtype="uint8")
            if len(image.shape)==3:
                single_channel =  cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                single_channel = image

            cnt, hierarchy = cv2.findContours(single_channel, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
            cv2.drawContours(outline, cnt, -1, (0,255,0), 1)
            i = 0
            validated_cnt = []

            while i < len(cnt):
                c = cnt[i]
                sq_cnt = np.squeeze(c)
                if len(sq_cnt.shape)==2:
                    validated_cnt.append(sq_cnt)
                i += 1
            image = outline
        except Exception as exc:
            print(self.conf_section, exc)

        return image, validated_cnt, code

    def stop(self):
        pass

