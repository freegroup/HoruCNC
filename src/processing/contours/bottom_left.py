import numpy as np
import cv2
import sys, os
import copy
from utils.contour import ensure_3D_contour, to_2D_contour

class Filter:
    def __init__(self):
        self.conf_section = None
        self.conf_file = None
        self.icon = None

    def meta(self):
        return {
            "filter": self.conf_section,
            "name":"BottomLeft",
            "description":"Align the contour bottom-left to the center point [0,0]",
            "parameters": [],
            "input": "contour",
            "output": "contour",
            "icon": self.icon
        }

    def configure(self, global_conf, conf_section, conf_file):
        self.conf_section = conf_section
        self.conf_file = conf_file

    def process(self, image, cnt_3d):
       if len(cnt_3d)>0:
            cnt = to_2D_contour(cnt_3d)
            # Determine the bounding rectangle of all contours
            x, y, w, h = cv2.boundingRect(np.concatenate(cnt))
            image_height, image_width = image.shape[0], image.shape[1]

            # the offset to move the center of the contour to [0,0]
            offset_x = x
            offset_y = y

            newimage = np.zeros(image.shape, dtype="uint8")
            newimage.fill(255)

            cnt_3d = [np.subtract(c, [offset_x, offset_y, 0], dtype=np.int32) for c in cnt_3d]

            drawing_cnt = to_2D_contour(cnt_3d)
            w2=image_width/2
            h2=image_height/2
            for c in drawing_cnt:
                i = 0
                while i < len(c):
                    p = c[i]
                    p[0] = p[0] + w2 - w/2
                    p[1] = p[1] + h2 - h/2
                    i+=1

            x, y, w, h = cv2.boundingRect(np.concatenate(drawing_cnt))

            # draw the width dimension
            # horizontal
            cv2.line(newimage, (x,y+h),(x+w,y+h), (255, 0, 0), 1)
            # vertical
            cv2.line(newimage, (x,y),(x,y+h), (0, 0, 255), 1)

            cv2.drawContours(newimage, drawing_cnt, -1,  (60,169,242), 1)
            image = newimage

       return image, cnt_3d

    def stop(self):
        pass

