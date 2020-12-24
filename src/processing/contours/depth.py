import numpy as np
import cv2
import copy
from utils.contour import ensure_3D_contour, to_2D_contour
import sys, os


class Filter:
    def __init__(self):
        self.conf_section = None
        self.conf_file = None
        self.icon = None
        self.depth_in_micro_m = 1000

    def meta(self):
        range_min = self.conf_file.get_float("depth_range_min", self.conf_section)
        range_max = self.conf_file.get_float("depth_range_max", self.conf_section)

        return {
            "filter": self.conf_section,
            "name": "CarveDepth",
            "description": "Define the carving depth of the contour",
            "parameters": [
                {
                    "name": "depth",
                    "label": "Depth",
                    "type": "slider",
                    "min": range_min,
                    "max": range_max,
                    "value": self.depth_in_micro_m
                }
            ],
            "input": "contour",
            "output": "contour",
            "icon": self.icon
        }

    def configure(self, global_conf, conf_section, conf_file):
        self.conf_section = conf_section
        self.conf_file = conf_file
        self.depth_in_micro_m = self.conf_file.get_float("depth_in_micro_m", self.conf_section)

    def process(self, image, cnt_3d):
        if len(cnt_3d) > 0:
            for c in cnt_3d:
                for p in c:
                    p[2] = -self.depth_in_micro_m

            cnt = to_2D_contour(cnt_3d)

            newimage = np.zeros(image.shape, dtype="uint8")
            newimage.fill(255)

            # create a new cnt for the drawing on the image. The cnt should cover 4/5 of the overal image
            #
            image_height, image_width = image.shape[0], image.shape[1]
            drawing_cnt = copy.deepcopy(cnt)
            x, y, w, h = cv2.boundingRect(np.concatenate(drawing_cnt))
            drawing_factor_w = (image_width / w) * 0.8
            drawing_factor_h = (image_height / h) * 0.8
            # ensure that the drawing fits into the preview image
            drawing_factor = drawing_factor_w if drawing_factor_w < drawing_factor_h else drawing_factor_h
            offset_x = (w / 2 + x) * drawing_factor
            offset_y = (h / 2 + y) * drawing_factor
            for c in drawing_cnt:
                i = 0
                while i < len(c):
                    p = c[i]
                    p[0] = (p[0] * drawing_factor) + (image_width / 2) - offset_x
                    p[1] = (p[1] * drawing_factor) + (image_height / 2) - offset_y
                    i += 1

            cv2.drawContours(newimage, drawing_cnt, -1, (60, 169, 242), 1)
            cv2.rectangle(newimage, (x, y), (x + w, y + h), (0, 255, 0), 1)

            # draw the carving depth
            cv2.putText(newimage, "Carving Depth {:.2f} mm".format(self.depth_in_micro_m / 1000), (20, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 0, 0), 4)

            image = newimage

        return image, cnt_3d

    def set_parameter(self, name, val):
        if name == "depth":
            val = float(val)
            self.depth_in_micro_m = val
            self.conf_file.set("depth_in_micro_m", self.conf_section, str(self.depth_in_micro_m))

    def stop(self):
        pass
