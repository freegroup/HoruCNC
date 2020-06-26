import numpy as np
import cv2
from grbl import GCode

class Filter:
    def __init__(self):
        self.config_section = None
        self.conf_file = None
        self.icon = None
        self.width_in_mm = None

    def meta(self):
        return {
            "filter": self.config_section,
            "name":" Outline GRBL",
            "description":"Generates GRBL Code of the contour",
            "parameter": False,
            "visible":True,
            "icon": self.icon
        }

    def configure(self, config_section, conf_file):
        self.config_section = config_section
        self.conf_file = conf_file
        self.width_in_mm = self.conf_file.get_int("width_in_mm", self.config_section)

    def process(self, image, cnt, code):
        try:
            if len(cnt)>0:
                cnt2 = np.concatenate(cnt)
                # Determine the bounding rectangle
                x, y, w, h = cv2.boundingRect(cnt2)

                height_in_mm = self.width_in_mm / w * h
                newimage = np.zeros(image.shape, dtype="uint8")
                newimage.fill(255)

                # shifted contour
                cv2.drawContours(newimage, cnt, -1, (0,0,255), 2)
                cv2.rectangle(newimage,(x,y),(x+w,y+h),(0,255,0),2)

                # draw the width dimension
                cv2.line(newimage, (x,y+int(h/2)),(x+w,y+int(h/2)), (255, 0, 0), 5)
                cv2.circle(newimage, (x,y+int(h/2)), 15, (255, 0, 0), -1)
                cv2.circle(newimage, (x+w,y+int(h/2)), 15, (255, 0, 0), -1)
                cv2.putText(newimage, "{:.1f} mm".format(self.width_in_mm),(x+20,y+int(h/2)-30), cv2.FONT_HERSHEY_SIMPLEX, 1.65, (255, 0, 0), 4)

                # draw the height dimension
                cv2.line(newimage, (x+int(w/2),y),(x+int(w/2),y+h), (255, 0, 0), 5)
                cv2.circle(newimage, (x+int(w/2),y), 15, (255, 0, 0), -1)
                cv2.circle(newimage, (x+int(w/2),y+h), 15, (255, 0, 0), -1)
                cv2.putText(newimage, "{:.1f} mm".format(height_in_mm),(x+int(w/2)+20,y+50), cv2.FONT_HERSHEY_SIMPLEX, 1.65, (255, 0, 0), 4)

                image = newimage
        except Exception as exc:
            print(exc)

        return image, cnt, code


    def set_parameter(self, val):
        self.width_in_mm = val
        self.conf_file.set("width_in_mm", self.config_section, str(val))


    def gcode(self, image, cnt, code):
        code = GCode()
        height, width, channel = image.shape
        if len(cnt)>0:
            for c in cnt:
                i = 0
                while i < len(c):
                    p = c[i]
                    if i == 0:
                        code.feed_rapid({"x":p[0]-width/2 , "y":(height - p[1])})
                        code.drop_mill()
                    else:
                        code.feed_linear({"x":p[0]-width/2, "y":(height - p[1])})

                    i+=1

                code.feed_linear({"x":(c[0][0]) ,"y": (height - c[0][1])})
                code.raise_mill()

        return image, cnt, code