import numpy as np
import cv2
from grbl import GCode

class Filter:
    def __init__(self):
        self.config_section = None
        self.conf_file = None
        self.icon = None
        self.cnt = None
        self.width_in_mm = 20

    def meta(self):
        return {
            "filter": self.config_section,
            "name":"Scale your Contours",
            "description":"Resize your shape until it fits your needs",
            "parameter": True,
            "icon": self.icon
        }

    def configure(self, config_section, conf_file):
        self.config_section = config_section
        self.conf_file = conf_file
        self.width_in_mm = self.conf_file.get_int("width_in_mm", self.config_section)

    def process(self, image, cnt, code):
        try:
            if len(cnt)>0:
                self.cnt = cnt
                unit = self.conf_file.get("display_unit", self.config_section)
                # only "cm" and "mm" are allowed
                unit = "cm" if unit == "cm" else "mm"
                display_factor = 1 if unit == "mm" else 0.1

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
                cv2.putText(newimage, "{:.1f} {}".format(self.width_in_mm*display_factor, unit),(x+20,y+int(h/2)-30), cv2.FONT_HERSHEY_SIMPLEX, 1.65, (255, 0, 0), 4)

                # draw the height dimension
                cv2.line(newimage, (x+int(w/2),y),(x+int(w/2),y+h), (255, 0, 0), 5)
                cv2.circle(newimage, (x+int(w/2),y), 15, (255, 0, 0), -1)
                cv2.circle(newimage, (x+int(w/2),y+h), 15, (255, 0, 0), -1)
                cv2.putText(newimage, "{:.1f} {}".format(height_in_mm*display_factor, unit),(x+int(w/2)+20,y+50), cv2.FONT_HERSHEY_SIMPLEX, 1.65, (255, 0, 0), 4)

                image = newimage
        except Exception as exc:
            print(exc)

        return image, cnt, self.gcode()


    def set_parameter(self, val):
        self.width_in_mm = val
        self.conf_file.set("width_in_mm", self.config_section, str(val))


    def gcode(self):
        code = GCode()
        if len(self.cnt)>0:
            cnt2 = np.concatenate(self.cnt)
            # Determine the bounding rectangle
            x, y, w, h = cv2.boundingRect(cnt2)

            # the offset to move the center of the gcode to [0,0]
            offset_x = w/2+x
            offset_y = h/2-y

            # the scale factor to fulfill the required width in [mm]
            scale_factor = self.width_in_mm / w

            # transform all coordinates and generate gcode
            # for this we must apply:
            #    - the scale factor
            #    - the x/y translation
            #    - flip them upside down (gcode coordinate system vs. openCV coordinate system)
            #
            for c in self.cnt:
                i = 0
                while i < len(c):
                    p = c[i]
                    x = '{:06.4f}'.format((     p[0] -offset_x)*scale_factor)
                    y = '{:06.4f}'.format(((h - p[1])-offset_y)*scale_factor)
                    position = {"x":x, "y":y}
                    if i == 0:
                        code.feed_rapid(position)
                        code.drop_mill()
                    else:
                        code.feed_linear(position)

                    i+=1

                x = '{:06.4f}'.format((     c[0][0] -offset_x)*scale_factor)
                y = '{:06.4f}'.format(((h - c[0][1])-offset_y)*scale_factor)
                code.feed_linear({"x":x ,"y": y})
                code.raise_mill()

        return code


    def stop(self):
        pass

