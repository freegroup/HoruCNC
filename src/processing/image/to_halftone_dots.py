import cv2
import numpy as np
import sys
import os
import math

from utils.image import image_resize
from utils.contour import ensure_3D_contour, to_2D_contour, contour_into_image
from processing.filter import BaseFilter


class Filter(BaseFilter):
    def __init__(self, conf_section, conf_file):
        BaseFilter.__init__(self, conf_section, conf_file)
        self.cutter_bit_angle = self.conf_file.get_float("cutter_bit_angle", self.conf_section)
        self.width_in_micro_m = self.conf_file.get_float("width_in_micro_m", self.conf_section)
        self.cutter_bit_length_in_micro_m = self.conf_file.get_float("cutter_bit_length_in_micro_m", self.conf_section)
        # cone circle diameter if the bit goes down the full cutter_bit_length
        self.cutter_bit_max_diameter_in_micro_m = math.tan(math.radians(self.cutter_bit_angle)) * self.cutter_bit_length_in_micro_m * 2
        self.max_diameter_in_micro_m = min(self.cutter_bit_max_diameter_in_micro_m, self.conf_file.get_float("max_diameter_in_micro_m", self.conf_section))
        self.display_unit = self.conf_file.get("display_unit", self.conf_section)
        # only "cm" and "mm" are allowed
        self.display_unit = "cm" if self.display_unit == "cm" else "mm"

    def meta(self):

        return {
            "name": "Calculate Halftone Dot",
            "description": f'Generates half tone dot pattern with a {self.cutter_bit_angle}° carving bit',
            "parameters": [
                {
                    "name": "diameter",
                    "label": "Maximal Hole Diameter",
                    "type": "slider",
                    "min": 500,
                    "max": self.cutter_bit_max_diameter_in_micro_m,
                    "value": self.max_diameter_in_micro_m
                },
                {
                    "name": "width",
                    "label": "Image Size",
                    "type": "slider",
                    "min": 1000,
                    "max": "200000",
                    "value": self.width_in_micro_m
                }
            ],
            "input": "image",
            "output": "contour"
        }

    def _process(self, image, cnt):
        try:
            image_height, image_width = image.shape[0], image.shape[1]
            height_in_micro_m = self.width_in_micro_m / image_width * image_height

            # "min" is required to avoid too much dots. Maximum is one dot/pixel
            dots_in_width = min(image_width, int(self.width_in_micro_m / self.max_diameter_in_micro_m))

            dots_in_height = int(height_in_micro_m / self.max_diameter_in_micro_m)
            dots_raster_in_micro_m = (self.width_in_micro_m / dots_in_width)
            dots_raster_in_pixel = (image_width / dots_in_width)
            max_diameter_in_pixel = dots_raster_in_pixel

            pixeled_image = cv2.cvtColor(image_resize(image, width=dots_in_width), cv2.COLOR_BGR2GRAY)

            h = pixeled_image.shape[0]
            w = pixeled_image.shape[1]

            generated_cnt = []

            # loop over the image and generate the tool path
            #
            def halftone_depth(gray):
                return (self.max_diameter_in_micro_m / 255 * (255 - gray)) / (math.tan(math.radians(self.cutter_bit_angle / 2)) * 2)

            def halftone_path(x, y):
                return np.array([[x * dots_raster_in_micro_m, y * dots_raster_in_micro_m, 0],
                                 [x * dots_raster_in_micro_m, y * dots_raster_in_micro_m, -halftone_depth(pixeled_image[y, x])]]).astype(np.int32)

            for y in range(0, h):
                for x in range(0, w):

                    # generate drill path for each pixel
                    if pixeled_image[y, x] < 250:
                        generated_cnt.append(halftone_path(x, y))

            preview_image = np.zeros(image.shape, dtype="uint8")
            preview_image.fill(255)

            # loop over the image and generate a preview for the toolpath
            #
            def circle_diameter(gray):
                return int((max_diameter_in_pixel / 255 * (255 - gray)))
            def circle(x, y):
                cv2.circle(preview_image,
                           (int(x * dots_raster_in_pixel),
                            int(y * dots_raster_in_pixel)),
                           circle_diameter(pixeled_image[y, x]),
                           (60, 169, 242), -1)
            for y in range(0, h):
                for x in range(0, w):
                    # draw a circle for each step in the preview
                    if pixeled_image[y, x] < 250:
                        circle(x, y)

            display_factor = 0.001 if self.display_unit == "mm" else 0.0001

            # draw the width dimension
            cv2.line(preview_image, (0, int(image_height / 2)), (image_width, int(image_height / 2)), (255, 0, 0), 1)
            cv2.putText(preview_image, "{:.1f} {}".format(self.width_in_micro_m * display_factor, self.display_unit),
                        (20, int(image_height / 2) - 30), cv2.FONT_HERSHEY_SIMPLEX, 1.65, (255, 0, 0), 4)

            # draw the height dimension
            cv2.line(preview_image, (int(image_width / 2), 0), (int(image_width / 2), image_height), (255, 0, 0), 1)
            cv2.putText(preview_image, "{:.1f} {}".format(height_in_micro_m * display_factor, self.display_unit),
                        (int(image_width / 2), 50), cv2.FONT_HERSHEY_SIMPLEX, 1.65, (255, 0, 0), 4)

            return preview_image, generated_cnt
        except Exception as exc:
            exc_type, exc_obj, exc_tb = sys.exc_info()
            fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
            print(exc_type, fname, exc_tb.tb_lineno)
            print(type(self), exc)

    def _set_parameter(self, name, val):
        if name == "diameter":
            val = float(val)
            self.max_diameter_in_micro_m = val
            self.conf_file.set("max_diameter_in_micro_m", self.conf_section, str(self.max_diameter_in_micro_m))
        if name == "width":
            self.width_in_micro_m = int(val)
            self.conf_file.set("width_in_micro_m", self.conf_section, str(self.width_in_micro_m))

