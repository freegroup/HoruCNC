import numpy as np
import cv2
import sys, os
import copy
from utils.contour import ensure_3D_contour, to_2D_contour, contour_into_image


class Filter:
    def __init__(self):
        self.conf_section = None
        self.conf_file = None
        self.icon = None

    def meta(self):
        return {
            "filter": self.conf_section,
            "name": "BottomLeft",
            "description": "Align the contour bottom-left to the center point [0,0]",
            "parameters": [],
            "input": "contour",
            "output": "contour",
            "icon": self.icon
        }

    def configure(self, global_conf, conf_section, conf_file):
        self.conf_section = conf_section
        self.conf_file = conf_file

    def process(self, image, cnt_3d):
        if len(cnt_3d) > 0:
            cnt = to_2D_contour(cnt_3d)
            # Determine the bounding rectangle of all contours
            x, y, w, h = cv2.boundingRect(np.concatenate(cnt))
            image_height, image_width = image.shape[0], image.shape[1]

            # subtract the offset to move the bottom-left of the contour to [0,0]
            cnt_3d = [np.subtract(c, [x, y, 0], dtype=np.int32) for c in cnt_3d]

            preview_image = np.zeros(image.shape, dtype="uint8")
            preview_image.fill(255)

            preview_cnt = contour_into_image(to_2D_contour(cnt_3d), preview_image)

            x, y, w, h = cv2.boundingRect(np.concatenate(preview_cnt))

            # draw the coordinate axes
            # x-axis
            cv2.line(preview_image, (x, y + h), (x + w, y + h), (255, 0, 0), 1)
            # y-axis
            cv2.line(preview_image, (x, y), (x, y + h), (0, 0, 255), 1)

            # draw the contour itself
            cv2.drawContours(preview_image, preview_cnt, -1, (60, 169, 242), 1)
            image = preview_image

        return image, cnt_3d

    def stop(self):
        pass
