import numpy as np
import cv2
from utils.contour import ensure_3D_contour, to_2D_contour, contour_into_image
from processing.filter import BaseFilter


class Filter(BaseFilter):
    def __init__(self, conf_section, conf_file):
        BaseFilter.__init__(self, conf_section, conf_file)

    def meta(self):
        return {
            "name": "Origin Contour",
            "description": "Moves the center of the contour to the coordinate [0,0]",
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

            # the offset to move the center of the contour to [0,0]
            offset_x = int(w / 2 + x)
            offset_y = int(h / 2 + y)

            cnt_3d = [np.subtract(c, [offset_x, offset_y, 0], dtype=np.int32) for c in cnt_3d]

            preview_image = np.zeros(image.shape, dtype="uint8")
            preview_image.fill(255)
            # generate a preview contour
            #
            preview_cnt = contour_into_image(to_2D_contour(cnt_3d), preview_image)

            # draw the coordinate system of the centered drawing contour
            x, y, w, h = cv2.boundingRect(np.concatenate(preview_cnt))
            cv2.drawContours(preview_image, preview_cnt, -1, (60, 169, 242), 1)
            # horizontal
            cv2.line(preview_image, (x + int(w / 2), y + int(h / 2)), (x + w, y + int(h / 2)), (255, 0, 0), 1)
            # vertical
            cv2.line(preview_image, (x + int(w / 2), y), (x + int(w / 2), y + int(h / 2)), (0, 0, 255), 1)

            image = preview_image

        return image, cnt_3d
