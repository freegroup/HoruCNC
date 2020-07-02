import numpy as np
import cv2

class Filter:
    def __init__(self):
        self.conf_section = None
        self.conf_file = None
        self.icon = None

    def meta(self):
        return {
            "filter": self.conf_section,
            "name":"Center Contour",
            "description":"Control the red contour before you start carving or exporting your CNC data",
            "parameter": False,
            "icon": self.icon
        }

    def configure(self, global_conf, conf_section, conf_file):
        self.conf_section = conf_section
        self.conf_file = conf_file

    def process(self, image, cnt, code):
        # Concatenate all contours
        try:
            if len(cnt)>0:
                cnt2 = np.concatenate(cnt)
                # Determine the bounding rectangle
                x, y, w, h = cv2.boundingRect(cnt2)

                image_height, image_width = image.shape[0], image.shape[1]
                newimage = np.zeros(image.shape, dtype="uint8")
                newimage.fill(255)

                # old contour
                cv2.drawContours(newimage, cnt, -1, (0,255,0), 1)

                shift_x = (x+(w/2)) - image_width/2
                shift_y = (y+(h/2)) - image_height/2
                for c in cnt:
                    i = 0
                    while i < len(c):
                        p = c[i]
                        p[0] -= shift_x
                        p[1] -= shift_y
                        i+=1
                # shifted contour
                cv2.drawContours(newimage, cnt, -1, (0,0,255), 2)
                image = newimage
        except Exception as exc:
            print(self.conf_section, exc)


        return image, cnt, code

    def stop(self):
        pass

