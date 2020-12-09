import numpy as np
import cv2
import copy

from utils.gcode import GCode

class Filter:
    def __init__(self):
        self.conf_section = None
        self.conf_file = None
        self.icon = None
        self.cnt = None
        self.depth_in_mm = 1


    def meta(self):
        range_min =  self.conf_file.get_float("depth_range_min", self.conf_section)
        range_max =  self.conf_file.get_float("depth_range_max", self.conf_section)
        range = range_max - range_min

        return {
            "filter": self.conf_section,
            "name":"To GCODE",
            "description":"Define the carving depth and the count of milling passes",
            "parameters": [
                {
                    "name": "depth",
                    "label": "Depth",
                    "type": "slider",
                    "min": 1,
                    "max": "255",
                    "value": (self.depth_in_mm - range_min)/(range /255.0)
                }
            ],
            "input": "contour",
            "output": "gcode",
            "icon": self.icon
        }


    def configure(self, global_conf, conf_section, conf_file):
        self.conf_section = conf_section
        self.conf_file = conf_file
        self.depth_in_mm = self.conf_file.get_float("depth_in_mm", self.conf_section)


    def process(self, image, cnt, code):
        try:
            if len(cnt)>0:
                self.cnt = cnt

                newimage = np.zeros(image.shape, dtype="uint8")
                newimage.fill(255)

                # create a new cnt for the drawing on the image. The cnt should cover 4/5 of the overal image
                #
                image_height, image_width = image.shape[0], image.shape[1]
                drawing_cnt = copy.deepcopy(cnt)
                x, y, w, h = cv2.boundingRect(np.concatenate(drawing_cnt))
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
                        p[0] = (p[0]*drawing_factor)+(image_width /2)-offset_x
                        p[1] = (p[1]*drawing_factor)+(image_height/2)-offset_y
                        i+=1

                cv2.drawContours(newimage, drawing_cnt, -1,  (60,169,242), 1)
                cv2.rectangle(newimage,(x,y),(x+w,y+h),(0,255,0),1)

                # draw the carving depth
                cv2.putText(newimage, "Carving Depth {:.1f} mm".format(self.depth_in_mm),(20,50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 0, 0), 4)

                image = newimage
        except Exception as exc:
            print(exc)

        return image, cnt, self.gcode()

    def gcode(self):
        clearance = self.conf_file.get_float(key="clearance", section=self.conf_section)
        feed_rate = self.conf_file.get_float(key="feed_rate", section=self.conf_section)
        depth_in_mm = self.conf_file.get_float(key="depth_in_mm", section=self.conf_section)

        code = GCode()
        code.feed_rate = feed_rate
        code.rapid_rate = feed_rate*2
        code.clearance = clearance

        if self.cnt and len(self.cnt)>0:
            # Determine the bounding rectangle
            x, y, w, h = cv2.boundingRect(np.concatenate(self.cnt))

            # scale contour from [micro m] to [mm]
            scale_factor = 0.001

            # transform all coordinates and generate gcode
            # for this we must apply:
            #    - the scale factor
            #    - flip them upside down (gcode coordinate system vs. openCV coordinate system)
            #
            shift_y = lambda y_coord: (-(y_coord-y)+(y+h) )

            code.raise_mill()
            code.feed_rapid({"x":0, "y":0})
            code.start_spindle()

            for c in self.cnt:
                i = 0
                while i < len(c):
                    p = c[i]
                    grbl_x = '{:06.4f}'.format(p[0]*scale_factor)
                    grbl_y = '{:06.4f}'.format((shift_y(p[1]))*scale_factor)
                    position = {"x":grbl_x, "y":grbl_y}
                    if i == 0:
                        code.feed_rapid(position)
                        code.drop_mill()
                        code.feed_linear({"z":-depth_in_mm}, feed_rate= feed_rate/4)
                    else:
                        code.feed_linear(position)
                    i+=1

                grbl_x = '{:06.4f}'.format((c[0][0])*scale_factor)
                grbl_y = '{:06.4f}'.format((shift_y(c[0][1]))*scale_factor)
                #y = '{:06.4f}'.format((    c[0][1])*scale_factor)
                code.feed_linear({"x":grbl_x ,"y": grbl_y})
                code.raise_mill()
            code.stop_spindle()
            code.feed_rapid({"x":0, "y":0})

        return code


    def set_parameter(self, name, val):
        if name=="depth":
            val = float(val)
            range_min =  self.conf_file.get_float("depth_range_min", self.conf_section)
            range_max =  self.conf_file.get_float("depth_range_max", self.conf_section)
            range = range_max - range_min

            self.depth_in_mm = (range /255.0)*val + range_min
            self.conf_file.set("depth_in_mm", self.conf_section, str(self.depth_in_mm))


    def stop(self):
        pass

