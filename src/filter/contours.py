import cv2
import numpy as np

class Filter:
    def __init__(self):
        self.config_section = None
        self.conf_file = None

    def meta(self):
        return {
            "filter": self.config_section,
            "name":"Contours",
            "description":"Generates the contour of your outline",
            "params": []
        }

    def configure(self, config_section, conf_file):
        self.config_section = config_section
        self.conf_file = conf_file

    def process(self, image, cnt, code):
        single_channel =  cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        cnt, hierarchy = cv2.findContours(single_channel, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(image, cnt, -1, (0,255,0), 1)

        i = 0
        while i < len(cnt):
            c = cnt[i]
            cnt[i] = np.squeeze(c)
            i += 1

        return image, cnt, code