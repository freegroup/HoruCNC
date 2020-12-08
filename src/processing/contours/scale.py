import numpy as np
import cv2
import copy

class Filter:
    def __init__(self):
        self.conf_section = None
        self.conf_file = None
        self.icon = None
        self.width_in_micro_m = 20000

    def meta(self):

        return {
            "filter": self.conf_section,
            "name":"Scale The Contour",
            "description":"Resize the contour until it fits your needs",
            "parameters": [
                {
                    "name": "width",
                    "label": "Width",
                    "type": "slider",
                    "min": 1000,
                    "max": "200000",
                    "value": self.width_in_micro_m
                }
            ],
            "input": "contour",
            "output": "contour",
            "icon": self.icon
        }


    def configure(self, global_conf, conf_section, conf_file):
        self.conf_section = conf_section
        self.conf_file = conf_file
        self.width_in_micro_m = self.conf_file.get_int("width_in_micro_m", self.conf_section)


    def process(self, image, cnt, code):
        try:
            if len(cnt)>0:
                unit = self.conf_file.get("display_unit", self.conf_section)
                # only "cm" and "mm" are allowed
                unit = "cm" if unit == "cm" else "mm"
                display_factor = 0.001 if unit == "mm" else 0.0001

                # Determine the origin bounding rectangle
                x, y, w, h = cv2.boundingRect(np.concatenate(cnt))
                image_height, image_width = image.shape[0], image.shape[1]

                # Ensure that width of the contour is the same as the width_in_mm.
                # Scale the contour to the required width.
                scaled_factor = self.width_in_micro_m/w
                scaled_cnt = copy.deepcopy(cnt)
                for c in scaled_cnt:
                    i = 0
                    while i < len(c):
                        p = c[i]
                        p[0] *= scaled_factor
                        p[1] *= scaled_factor
                        i+=1

                # create a new cnt for the drawing on the image. The cnt should cover 4/5 of the overal image
                #
                drawing_cnt = copy.deepcopy(scaled_cnt)
                x, y, w, h = cv2.boundingRect(np.concatenate(drawing_cnt))
                height_in_micro_m = self.width_in_micro_m / w * h
                drawing_factor_w = (image_width/w)*0.8
                drawing_factor_h = (image_height/h)*0.8
                # ensure that the drawing fits into the preview image
                drawing_factor = drawing_factor_w if drawing_factor_w<drawing_factor_h else drawing_factor_h
                offset_x = (w/2+x)*drawing_factor
                offset_y = (h/2+y)*drawing_factor
                for c in drawing_cnt:
                    i = 0
                    while i < len(c):
                        p = c[i]
                        p[0] = (p[0]*drawing_factor)+(image_width/2)-offset_x
                        p[1] = (p[1]*drawing_factor)+(image_height/2)-offset_y
                        i+=1

                # generate a preview image
                #
                newimage = np.zeros(image.shape, dtype="uint8")
                newimage.fill(255)

                # determine the drawing bounding box
                x, y, w, h = cv2.boundingRect(np.concatenate(drawing_cnt))

                # draw the centered contour
                cv2.drawContours(newimage, drawing_cnt, -1,  (60,169,242), 1)
                cv2.rectangle(newimage,(x,y),(x+w,y+h),(0,255,0),2)

                # draw the width dimension
                cv2.line(newimage, (x,y+int(h/2)),(x+w,y+int(h/2)), (255, 0, 0), 2)
                cv2.circle(newimage, (x,y+int(h/2)), 15, (255, 0, 0), -1)
                cv2.circle(newimage, (x+w,y+int(h/2)), 15, (255, 0, 0), -1)
                cv2.putText(newimage, "{:.1f} {}".format(self.width_in_micro_m*display_factor, unit),(x+20,y+int(h/2)-30), cv2.FONT_HERSHEY_SIMPLEX, 1.65, (255, 0, 0), 4)

                # draw the height dimension
                cv2.line(newimage, (x+int(w/2),y),(x+int(w/2),y+h), (255, 0, 0), 2)
                cv2.circle(newimage, (x+int(w/2),y), 15, (255, 0, 0), -1)
                cv2.circle(newimage, (x+int(w/2),y+h), 15, (255, 0, 0), -1)
                cv2.putText(newimage, "{:.1f} {}".format(height_in_micro_m*display_factor, unit),(x+int(w/2)+20,y+50), cv2.FONT_HERSHEY_SIMPLEX, 1.65, (255, 0, 0), 4)

                image = newimage
        except Exception as exc:
            print(exc)

        return image, scaled_cnt, code


    def centered_contour(self, cnt, width, height):
        pass

    def set_parameter(self, name, val):
        if name=="width":
            self.width_in_micro_m = int(val)
            self.conf_file.set("width_in_micro_m", self.conf_section, str(self.width_in_micro_m))

    def stop(self):
        pass

