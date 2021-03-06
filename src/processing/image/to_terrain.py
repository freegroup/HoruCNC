import cv2
import numpy as np
import sys
import os

from utils.contour import ensure_3D_contour, to_2D_contour, contour_into_image
from processing.filter import BaseFilter

class Filter(BaseFilter):
    def __init__(self, conf_section, conf_file):
        BaseFilter.__init__(self, conf_section, conf_file)
        self.depth_in_micro_m = self.conf_file.get_float("depth_in_micro_m", self.conf_section)

    def meta(self):
        range_min = self.conf_file.get_float("depth_range_min", self.conf_section)
        range_max = self.conf_file.get_float("depth_range_max", self.conf_section)

        return {
            "name": "Carve Height Map",
            "description": "Generates height map terrain toolpaths from an grayscale Image",
            "parameters": [
                {
                    "name": "depth",
                    "label": "Maximal Carving Depth",
                    "type": "slider",
                    "min": range_min,
                    "max": range_max,
                    "value": self.depth_in_micro_m
                }
            ],
            "input": "image",
            "output": "contour"
        }

    def _process(self, image, cnt):
        try:
            single_channel = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

            generated_cnt = []

            row_index = 0  # [micro m]
            normalized_depth = self.depth_in_micro_m / 255
            for row in single_channel:
                rle_row = [rle for rle in self.rle(row) if rle[0] < 250]
                last_end = None
                last_contour = None
                for rle in rle_row:
                    # gray => depth in [micro m]
                    # 255  => 0 [micro m]                     # white means no cutting
                    #   0  => self.depth_in_micro_m [micro m] # black is full depth
                    depth = -(self.depth_in_micro_m - (normalized_depth * rle[0]))
                    gray_start = rle[1]
                    gray_end = rle[2] + gray_start
                    if gray_start == last_end:
                        last_contour = last_contour+[
                            [gray_start, row_index, depth],
                            [gray_end,   row_index, depth]
                        ]
                    else:
                        if not last_contour is None:
                            generated_cnt.append(np.array(last_contour,  dtype=np.int32))
                        last_contour = [
                            [gray_start, row_index, depth],
                            [gray_end,   row_index, depth]
                        ]
                    last_end = gray_end
                if not last_contour is None:
                    generated_cnt.append(np.array(last_contour,  dtype=np.int32))
                row_index += 1

            # generate a preview image
            #
            preview_image = np.zeros(image.shape, dtype="uint8")
            preview_image.fill(255)

            # generate a preview contour
            #
            preview_cnt = contour_into_image(to_2D_contour(generated_cnt), preview_image)

            cv2.drawContours(preview_image, preview_cnt, -1, (60, 169, 242), 1)
            # draw the carving depth
            cv2.putText(preview_image, "Carving Depth {:.2f} mm".format(self.depth_in_micro_m / 1000), (20, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 0, 0), 4)

            image = preview_image

            return image, generated_cnt
        except Exception as exc:
            exc_type, exc_obj, exc_tb = sys.exc_info()
            fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
            print(exc_type, fname, exc_tb.tb_lineno)
            print(type(self), exc)

    # @perf_tracker()
    def rle(self, inarray):
        """ run length encoding. Partial credit to R rle function.
            Multi datatype arrays catered for including non Numpy
            returns: tuple ([value, start, len],...) """
        ia = np.asarray(inarray)  # force numpy
        n = len(ia)
        y = np.array(ia[1:] != ia[:-1])  # pairwise unequal (string safe)
        i = np.append(np.where(y), n - 1)  # must include last element posi
        z = np.diff(np.append(-1, i))  # run lengths
        p = np.cumsum(np.append(0, z))[:-1]  # positions
        return np.stack((ia[i], p, z), axis=1)

    def _set_parameter(self, name, val):
        if name == "depth":
            val = float(val)
            self.depth_in_micro_m = val
            self.conf_file.set("depth_in_micro_m", self.conf_section, str(self.depth_in_micro_m))

