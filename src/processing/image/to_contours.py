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
            "parameters": [],
            "input": "image",
            "output": "contour",
            "icon": self.icon
        }

    def configure(self, global_conf, conf_section, conf_file):
        self.conf_section = conf_section
        self.conf_file = conf_file

    def process(self, image, cnt):
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
                sq_cnt = np.append(sq_cnt, [[sq_cnt[0][0], sq_cnt[0][1]]], axis=0)
                validated_cnt.append(sq_cnt)
            i += 1
        image = outline

        return image, validated_cnt

    def stop(self):
        pass

