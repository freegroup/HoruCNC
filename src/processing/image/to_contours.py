import cv2
import numpy as np
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
            "name": "Contours",
            "description": "Calculates the toolpath of the shape contour of the image",
            "parameters": [
                {
                    "name": "width",
                    "label": "Size",
                    "type": "slider",
                    "min": 1000,
                    "max": "200000",
                    "value": self.width_in_micro_m
                }
            ],
            "input": "image",
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

    def process(self, image, cnt):
        try:
            # generate an inverted, single channel image. Normally OpenCV detect on "white"....but we
            # want use "black" as contour foundation
            #
            single_channel = 255 - cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

            # determine the contour
            #
            cnt, hierarchy = cv2.findContours(single_channel, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
            i = 0
            validated_cnt = []
            while i < len(cnt):
                c = cnt[i]
                sq_cnt = np.squeeze(c)
                if len(sq_cnt.shape) == 2:
                    sq_cnt = np.append(sq_cnt, [[sq_cnt[0][0], sq_cnt[0][1]]], axis=0)
                    validated_cnt.append(sq_cnt)
                i += 1

            # scale the contour to the user defined width
            #
            if len(validated_cnt) > 0:
                # Determine the origin bounding rectangle
                x, y, w, h = cv2.boundingRect(np.concatenate(validated_cnt))

                # Ensure that width of the contour is the same as the width_in_mm.
                # Scale the contour to the required width.
                scale_factor = self.width_in_micro_m / w
                scaled_cnt = [np.multiply(c.astype(np.float), [scale_factor, scale_factor]).astype(np.int32) for c in validated_cnt]

                # generate a preview image
                #
                preview_image = np.zeros(image.shape, dtype="uint8")
                preview_image.fill(255)

                # generate a preview contour
                #
                preview_cnt = contour_into_image(scaled_cnt, preview_image)
                x, y, w, h = cv2.boundingRect(np.concatenate(preview_cnt))

                # draw the preview contour
                cv2.drawContours(preview_image, preview_cnt, -1, (60, 169, 242), 1)

                display_factor = 0.001 if self.display_unit == "mm" else 0.0001

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
                validated_cnt = scaled_cnt
        except Exception as exc:
            exc_type, exc_obj, exc_tb = sys.exc_info()
            fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
            print(exc_type, fname, exc_tb.tb_lineno)
            print(type(self), exc)

        return image, validated_cnt

    def set_parameter(self, name, val):
        if name == "width":
            self.width_in_micro_m = int(val)
            self.conf_file.set("width_in_micro_m", self.conf_section, str(self.width_in_micro_m))

    def stop(self):
        pass
