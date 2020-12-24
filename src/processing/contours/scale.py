import numpy as np
import cv2
import copy
import sys
import os
from utils.contour import ensure_3D_contour, to_2D_contour


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
            "description": "Resize the contour until it fits your needs",
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

            # create a new cnt for the drawing on the image. The cnt should cover 4/5 of the overall image
            #
            height_in_micro_m = self.width_in_micro_m / w * h
            image_height, image_width = image.shape[0], image.shape[1]
            drawing_factor_w = (image_width / w) * 0.8
            drawing_factor_h = (image_height / h) * 0.8
            # ensure that the drawing fits into the preview image
            drawing_factor = drawing_factor_w if drawing_factor_w < drawing_factor_h else drawing_factor_h
            offset_x = (image_width / 2) - (w / 2 + x) * drawing_factor
            offset_y = (image_height / 2) - (h / 2 + y) * drawing_factor
            drawing_cnt = [np.add(np.multiply(c.astype(np.float), [drawing_factor, drawing_factor]),
                                  [offset_x, offset_y]).astype(np.int32) for c in cnt]

            # generate a preview image
            #
            newimage = np.zeros(image.shape, dtype="uint8")
            newimage.fill(255)

            # determine the drawing bounding box
            x, y, w, h = cv2.boundingRect(np.concatenate(drawing_cnt))

            # draw the centered contour
            cv2.drawContours(newimage, drawing_cnt, -1, (60, 169, 242), 1)
            cv2.rectangle(newimage, (x, y), (x + w, y + h), (0, 255, 0), 2)

            # draw the width dimension
            cv2.line(newimage, (x, y + int(h / 2)), (x + w, y + int(h / 2)), (255, 0, 0), 2)
            cv2.circle(newimage, (x, y + int(h / 2)), 15, (255, 0, 0), -1)
            cv2.circle(newimage, (x + w, y + int(h / 2)), 15, (255, 0, 0), -1)
            cv2.putText(newimage, "{:.1f} {}".format(self.width_in_micro_m * display_factor, self.display_unit),
                        (x + 20, y + int(h / 2) - 30), cv2.FONT_HERSHEY_SIMPLEX, 1.65, (255, 0, 0), 4)

            # draw the height dimension
            cv2.line(newimage, (x + int(w / 2), y), (x + int(w / 2), y + h), (255, 0, 0), 2)
            cv2.circle(newimage, (x + int(w / 2), y), 15, (255, 0, 0), -1)
            cv2.circle(newimage, (x + int(w / 2), y + h), 15, (255, 0, 0), -1)
            cv2.putText(newimage, "{:.1f} {}".format(height_in_micro_m * display_factor, self.display_unit),
                        (x + int(w / 2) + 20, y + 50), cv2.FONT_HERSHEY_SIMPLEX, 1.65, (255, 0, 0), 4)

            image = newimage
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
