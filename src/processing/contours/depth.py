import numpy as np
import cv2
from utils.contour import ensure_3D_contour, to_2D_contour, contour_into_image


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

    def configure(self, conf_section, conf_file):
        self.conf_section = conf_section
        self.conf_file = conf_file
        self.depth_in_micro_m = self.conf_file.get_float("depth_in_micro_m", self.conf_section)

    def process(self, image, cnt_3d):
        if len(cnt_3d) > 0:
            for c in cnt_3d:
                for p in c:
                    p[2] = -self.depth_in_micro_m

            cnt = to_2D_contour(cnt_3d)

            preview_image = np.zeros(image.shape, dtype="uint8")
            preview_image.fill(255)

            # create a new cnt for the drawing on the image. The cnt should cover 4/5 of the overall image
            preview_cnt = contour_into_image(cnt, preview_image)
            cv2.drawContours(preview_image, preview_cnt, -1, (60, 169, 242), 1)

            # draw the carving depth
            cv2.putText(preview_image, "Carving Depth {:.2f} mm".format(self.depth_in_micro_m / 1000), (20, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 0, 0), 4)

            image = preview_image

        return image, cnt_3d

    def set_parameter(self, name, val):
        if name == "depth":
            val = float(val)
            self.depth_in_micro_m = val
            self.conf_file.set("depth_in_micro_m", self.conf_section, str(self.depth_in_micro_m))

    def stop(self):
        pass
