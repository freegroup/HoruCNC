import cv2
import numpy as np
import sys
import os
import math


from utils.contour import ensure_3D_contour, to_2D_contour, normalize_contour
from processing.filter import BaseFilter


class Filter(BaseFilter):
    def __init__(self, conf_section, conf_file):
        BaseFilter.__init__(self, conf_section, conf_file)
        self.width_in_micro_m = self.conf_file.get_int("width_in_micro_m", self.conf_section)
        self.cutter_bit_angle = self.conf_file.get_float("cutter_bit_angle", self.conf_section)
        self.cutter_bit_length_in_micro_m = self.conf_file.get_float("cutter_bit_length_in_micro_m", self.conf_section)
        # cone circle diameter if the bit goes down the full cutter_bit_length
        self.cutter_bit_max_diameter_in_micro_m = math.tan(math.radians(self.cutter_bit_angle)) * self.cutter_bit_length_in_micro_m * 2
        self.max_diameter_in_micro_m = min(self.cutter_bit_max_diameter_in_micro_m, self.conf_file.get_float("max_diameter_in_micro_m", self.conf_section))
        self.display_unit = self.conf_file.get("display_unit", self.conf_section)
        self.cutter_bit_diameter_in_micro_m = self.conf_file.get_float("cutter_bit_diameter_in_micro_m", self.conf_section)
        # only "cm" and "mm" are allowed
        self.display_unit = "cm" if self.display_unit == "cm" else "mm"

    def meta(self):

        return {
            "name": "Calligraphy",
            "description": f'Calculates toolpath aong the skeleton path of the image with an {self.cutter_bit_angle}° carving bit',
            "parameters": [
                {
                    "name": "diameter",
                    "label": "Max Stroke",
                    "type": "slider",
                    "min": 0,
                    "max": self.cutter_bit_max_diameter_in_micro_m,
                    "value": self.max_diameter_in_micro_m
                },
                {
                    "name": "width",
                    "label": "Image Width",
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
            PADDING = 2
            # add padding to the image to avoid that we run out of index in the np.amax calculation
            image = cv2.copyMakeBorder(image, PADDING, PADDING, PADDING, PADDING,  cv2.BORDER_CONSTANT, None, [255, 255, 255])

            image_height, image_width = image.shape[0], image.shape[1]

            # generate the skeleton of the "BLACK" area and returns an image in which the
            # "white" part is the skeleton.
            #
            image_skeleton = image.copy()  # deepcopy to protect the original image
            image_skeleton = cv2.threshold(image_skeleton, 127, 255, cv2.THRESH_BINARY_INV)[1]
            image_skeleton, _, _ = cv2.split(image_skeleton)
            #image_skeleton = 255 - cv2.ximgproc.thinning(image_skeleton, cv2.ximgproc.THINNING_GUOHALL)
            image_skeleton = cv2.ximgproc.thinning(image_skeleton, cv2.ximgproc.THINNING_ZHANGSUEN)

            # calculate the watershed distance. This is a distance calculation of the original image
            #
            image_watershed = 255 - cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            image_watershed = cv2.distanceTransform(image_watershed, cv2.DIST_L2, 5)
            image_watershed = cv2.convertScaleAbs(image_watershed)
            image_watershed = cv2.normalize(image_watershed, None, 255, 0, cv2.NORM_MINMAX, cv2.CV_8UC1)

            # calculate the mask and use just the pixel and the intensity for the carving depth
            # now we have just the skeleton image with the distance information (carving depth)
            image_carvingpath = cv2.bitwise_and(image_watershed, image_skeleton)

            # CHAIN_APPROX_NONE is important to get each and every pixel in the contour and not the reduced one.
            #
            cnt, hierarchy = cv2.findContours(image_skeleton, cv2.RETR_TREE, cv2.CHAIN_APPROX_NONE)
            cnt = normalize_contour(cnt)
            x, y, w, h = cv2.boundingRect(np.concatenate(cnt))

            preview_image = np.zeros(image.shape, dtype="uint8")
            preview_image.fill(255)

            generated_cnt = ensure_3D_contour(cnt)
            dots_in_width = int(self.width_in_micro_m / min(self.cutter_bit_diameter_in_micro_m, self.max_diameter_in_micro_m))
            max_diameter_in_pixel = (image_width / dots_in_width)
            carving_depth = lambda gray: -(self.max_diameter_in_micro_m / 255 * (gray)) / (math.tan(math.radians(self.cutter_bit_angle / 2)) * 2)
            circle_radius = lambda gray: int(((max_diameter_in_pixel / 255) * (gray))/2)
            for c in generated_cnt:
                i = 0
                while i < len(c):
                    p = c[i]
                    row = p[1]
                    col = p[0]
                    neighbours = image_carvingpath[row-2:row+2, col-2:col+2]
                    max = np.amax(neighbours)
                    p[2] = carving_depth(max)
                    cv2.circle(preview_image, (col, row), circle_radius(max), (60, 169, 242), -1)
                    i = i+1

            cv2.drawContours(preview_image, to_2D_contour(generated_cnt), -1, (0, 49, 252), 1)

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

            # Ensure that width of the contour is the same as the width_in_mm.
            # Scale the contour to the required width.
            scale_factor = self.width_in_micro_m / w
            generated_cnt = [np.multiply(c.astype(np.float), [scale_factor, scale_factor, 1]).astype(np.int32) for c in generated_cnt]
            preview_image = preview_image[PADDING:-PADDING, PADDING:-PADDING]
            return preview_image, generated_cnt
        except Exception as exc:
            exc_type, exc_obj, exc_tb = sys.exc_info()
            fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
            print(exc_type, fname, exc_tb.tb_lineno)
            print(type(self), exc)

    def _set_parameter(self, name, val):
        if name == "diameter":
            val = float(val)
            self.max_diameter_in_micro_m = min(self.cutter_bit_diameter_in_micro_m,val)
            self.conf_file.set("max_diameter_in_micro_m", self.conf_section, str(self.max_diameter_in_micro_m))
        if name == "width":
            self.width_in_micro_m = int(val)
            self.conf_file.set("width_in_micro_m", self.conf_section, str(self.width_in_micro_m))
