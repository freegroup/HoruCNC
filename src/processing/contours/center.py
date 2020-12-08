import numpy as np
import cv2
import sys, os

class Filter:
    def __init__(self):
        self.conf_section = None
        self.conf_file = None
        self.icon = None

    def meta(self):
        return {
            "filter": self.conf_section,
            "name":"Center Contour",
            "description":"Center the calculated contour",
            "parameters": [],
            "input": "contour",
            "output": "contour",
            "icon": self.icon
        }

    def configure(self, global_conf, conf_section, conf_file):
        self.conf_section = conf_section
        self.conf_file = conf_file

    def process(self, image, cnt, code):
        try:
            if len(cnt)>0:
                # Determine the bounding rectangle of all contours
                x, y, w, h = cv2.boundingRect(np.concatenate(cnt))
                image_height, image_width = image.shape[0], image.shape[1]

                newimage = np.zeros(image.shape, dtype="uint8")
                newimage.fill(255)

                shift_x = (x+(w/2)) - image_width/2
                shift_y = (y+(h/2)) - image_height/2
                for c in cnt:
                    i = 0
                    while i < len(c):
                        p = c[i]
                        p[0] -= shift_x
                        p[1] -= shift_y
                        i+=1

                cv2.drawContours(newimage, cnt, -1, (60,169,242), 1)
                image = newimage
        except Exception as exc:
            exc_type, exc_obj, exc_tb = sys.exc_info()
            fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
            print(exc_type, fname, exc_tb.tb_lineno)
            print(self.conf_section, exc)

        return image, cnt, code

    def stop(self):
        pass

