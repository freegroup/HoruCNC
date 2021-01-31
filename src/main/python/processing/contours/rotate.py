import numpy as np
import cv2
import sys, os
import math

from utils.contour import ensure_3D_contour, to_2D_contour, contour_into_image
from processing.filter import BaseFilter


class Filter(BaseFilter):
    def __init__(self, conf_section, conf_file):
        BaseFilter.__init__(self, conf_section, conf_file)
        self.angle_in_degree = self.conf_file.get_float("angle_in_degree", self.conf_section)

    def meta(self):
        return {
            "name": "Rotate Contour",
            "description": "Rotate the contour by a given angle",
            "parameters": [
                {
                    "name": "angle",
                    "label": "Angle",
                    "type": "slider",
                    "min": 0,
                    "max": 360,
                    "value": self.angle_in_degree
                }
            ],
            "input": "contour",
            "output": "contour"
        }

    def _process(self, image, cnt_3d):
        try:
            if len(cnt_3d) > 0:
                cnt = to_2D_contour(cnt_3d)
                x, y, w, h = cv2.boundingRect(np.concatenate(cnt))
                image_height, image_width = image.shape[0], image.shape[1]

                # the offset to move the center of the contour to [0,0]
                cx = int(w / 2 + x)
                cy = int(h / 2 + y)

                a = math.radians(self.angle_in_degree)
                ca = math.cos(a)
                sa = math.sin(a)

                rotate_point = lambda p: [
                    int(((p[0] - cx) * ca) - ((p[1] - cy) * sa) + cx),
                    int(((p[0] - cx) * sa) + ((p[1] - cy) * ca) + cy),
                    p[2]
                ]
                rotate_cnt = lambda c: np.array([rotate_point(p) for p in c])
                cnt_3d = [rotate_cnt(c) for c in cnt_3d]

                preview_image = np.zeros(image.shape, dtype="uint8")
                preview_image.fill(255)
                # generate a preview contour
                #
                preview_cnt = contour_into_image(to_2D_contour(cnt_3d), preview_image)

                # draw the coordinate system of the centered drawing contour
                x, y, w, h = cv2.boundingRect(np.concatenate(preview_cnt))
                cv2.drawContours(preview_image, preview_cnt, -1, (60, 169, 242), 1)
                # horizontal
                cv2.line(preview_image, (x + int(w / 2), y + int(h / 2)), (x + w, y + int(h / 2)), (255, 0, 0), 1)
                # vertical
                cv2.line(preview_image, (x + int(w / 2), y), (x + int(w / 2), y + int(h / 2)), (0, 0, 255), 1)

                image = newimage
        except Exception as exc:
            exc_type, exc_obj, exc_tb = sys.exc_info()
            fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
            print(exc_type, fname, exc_tb.tb_lineno)
            print(type(self), exc)

        return image, cnt_3d

    def _set_parameter(self, name, val):
        if name == "angle":
            self.angle_in_degree = int(val)
            self.conf_file.set("angle_in_degree", self.conf_section, str(self.angle_in_degree))
