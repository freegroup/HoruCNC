import cv2
import numpy as np
import sys
import os
import time

from utils.contour import ensure_3D_contour, to_2D_contour


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
            "name": "HeightMap",
            "description": "Generates Terrain from Grayscale Image",
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
            "input": "image",
            "output": "contour",
            "icon": self.icon
        }

    def configure(self, global_conf, conf_section, conf_file):
        self.conf_section = conf_section
        self.conf_file = conf_file
        self.depth_in_micro_m = self.conf_file.get_float("depth_in_micro_m", self.conf_section)

    def process(self, image, cnt):
        single_channel = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        terrain_cnt = []

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
                        terrain_cnt.append(np.array(last_contour,  dtype=np.int32))
                    last_contour = [
                        [gray_start, row_index, depth],
                        [gray_end,   row_index, depth]
                    ]
                last_end = gray_end
            if not last_contour is None:
                terrain_cnt.append(np.array(last_contour,  dtype=np.int32))
            row_index += 1

        start_img = time.process_time()
        newimage = np.zeros(image.shape, dtype="uint8")
        newimage.fill(255)
        drawing_cnt = to_2D_contour(terrain_cnt)
        cv2.drawContours(newimage, drawing_cnt, -1, (60, 169, 242), 1)
        # draw the carving depth
        cv2.putText(newimage, "Carving Depth {:.2f} mm".format(self.depth_in_micro_m / 1000), (20, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 0, 0), 4)

        image = newimage

        return image, terrain_cnt

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

    def set_parameter(self, name, val):
        if name == "depth":
            val = float(val)
            self.depth_in_micro_m = val
            self.conf_file.set("depth_in_micro_m", self.conf_section, str(self.depth_in_micro_m))

    def stop(self):
        pass
