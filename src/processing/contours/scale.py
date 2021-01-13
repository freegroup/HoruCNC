import numpy as np
import cv2
import copy
import sys
import os
from utils.contour import ensure_3D_contour, to_2D_contour, contour_into_image


class Filter:
    def __init__(self):
        self.conf_section = None
        self.conf_file = None
        self.icon = None
        self.width_in_micro_m = 20000
        self.display_unit = "mm"

    def meta(self):

        return {
            "filter": self.conf_section,
            "name": "Scale The Contour",
            "description": "Resizes the contour by the given Width",
            "parameters": [
                {
                    "name": "width",
                    "label": "Width",
                    "type": "slider",
                    "min": 1000,
                    "max": "200000",
                    "value": self.width_in_micro_m
                }
            ],
            "input": "contour",
            "output": "contour",
            "icon": self.icon
        }

    def configure(self, global_conf, conf_section, conf_file):
        self.conf_section = conf_section
        self.conf_file = conf_file
        self.width_in_micro_m = self.conf_file.get_int("width_in_micro_m", self.conf_section)
        self.display_unit = self.conf_file.get("display_unit", self.conf_section)
        # only "cm" and "mm" are allowed
        self.display_unit = "cm" if self.display_unit == "cm" else "mm"

    def process(self, image, cnt_3d):
        if len(cnt_3d) > 0:
            cnt = to_2D_contour(cnt_3d)
            display_factor = 0.001 if self.display_unit == "mm" else 0.0001

            # Determine the origin bounding rectangle
            x, y, w, h = cv2.boundingRect(np.concatenate(cnt))

            # Ensure that width of the contour is the same as the width_in_mm.
            # Scale the contour to the required width.
            scaled_factor = self.width_in_micro_m / w
            scaled_cnt = [np.multiply(c.astype(np.float), [scaled_factor, scaled_factor, 1]).astype(np.int32) for c in cnt_3d]

            # generate a preview image
            #
            preview_image = np.zeros(image.shape, dtype="uint8")
            preview_image.fill(255)

            # generate a preview contour
            #
            preview_cnt = contour_into_image(to_2D_contour(scaled_cnt), preview_image)

            # determine the drawing bounding box
            x, y, w, h = cv2.boundingRect(np.concatenate(preview_cnt))

            # draw the centered contour
            cv2.drawContours(preview_image, preview_cnt, -1, (60, 169, 242), 1)

            # draw the width dimension
            cv2.line(preview_image, (x, y + int(h / 2)), (x + w, y + int(h / 2)), (255, 0, 0), 1)
            cv2.circle(preview_image, (x, y + int(h / 2)), 5, (255, 0, 0), -1)
            cv2.circle(preview_image, (x + w, y + int(h / 2)), 5, (255, 0, 0), -1)
            cv2.putText(preview_image, "{:.1f} {}".format(self.width_in_micro_m * display_factor, self.display_unit),
                        (x + 20, y + int(h / 2) - 30), cv2.FONT_HERSHEY_SIMPLEX, 1.65, (255, 0, 0), 4)

            # draw the height dimension
            height_in_micro_m = self.width_in_micro_m / w * h
            cv2.line(preview_image, (x + int(w / 2), y), (x + int(w / 2), y + h), (255, 0, 0), 1)
            cv2.circle(preview_image, (x + int(w / 2), y), 5, (255, 0, 0), -1)
            cv2.circle(preview_image, (x + int(w / 2), y + h), 5, (255, 0, 0), -1)
            cv2.putText(preview_image, "{:.1f} {}".format(height_in_micro_m * display_factor, self.display_unit),
                        (x + int(w / 2) + 20, y + 50), cv2.FONT_HERSHEY_SIMPLEX, 1.65, (255, 0, 0), 4)

            image = preview_image
            cnt_3d = scaled_cnt

        return image, cnt_3d

    def centered_contour(self, cnt, width, height):
        pass

    def set_parameter(self, name, val):
        if name == "width":
            self.width_in_micro_m = int(val)
            self.conf_file.set("width_in_micro_m", self.conf_section, str(self.width_in_micro_m))

    def stop(self):
        pass
