import numpy as np
import cv2

from utils.contour import ensure_3D_contour, to_2D_contour
from processing.filter import BaseFilter


class Filter(BaseFilter):
    def __init__(self, conf_section, conf_file):
        BaseFilter.__init__(self, conf_section, conf_file)

    def meta(self):
        return {
            "name": "Center Contour",
            "description": "Center the calculated contour into the image",
            "parameters": [],
            "input": "contour",
            "output": "contour"
        }


    def _process(self, image, cnt_3d):
        if len(cnt_3d) > 0:
            cnt = to_2D_contour(cnt_3d)
            # Determine the bounding rectangle of all contours
            x, y, w, h = cv2.boundingRect(np.concatenate(cnt))
            image_height, image_width = image.shape[0], image.shape[1]

            shift_x = int((x + (w / 2)) - image_width / 2)
            shift_y = int((y + (h / 2)) - image_height / 2)
            cnt_3d = [np.subtract(c, [shift_x, shift_y, 0], dtype=np.int32) for c in cnt_3d]

            cnt = to_2D_contour(cnt_3d)
            newimage = np.zeros(image.shape, dtype="uint8")
            newimage.fill(255)
            cv2.drawContours(newimage, cnt, -1, (60, 169, 242), 1)
            image = newimage

        return image, cnt_3d
