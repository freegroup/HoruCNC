import numpy as np
import cv2
from utils.contour import ensure_3D_contour, to_2D_contour

from utils.gcode import GCode
from processing.filter import BaseFilter


class Filter(BaseFilter):
    def __init__(self, conf_section, conf_file):
        BaseFilter.__init__(self, conf_section, conf_file)

    def meta(self):
        return {
            "name": "Download GCODE",
            "description": "Generates GCODE from the calculated contour data",
            "parameters": [],
            "input": "contour",
            "output": "gcode"
        }

    def _process(self, image, cnt_3d):
        return image, cnt_3d

    def gcode(self, cnt_3d):
        cnt = to_2D_contour(cnt_3d)

        clearance = self.conf_file.get_float(key="clearance", section=self.conf_section)
        feed_rate = self.conf_file.get_float(key="feed_rate", section=self.conf_section)

        code = GCode()
        code.feed_rate = feed_rate
        code.rapid_rate = feed_rate * 2
        code.clearance = clearance

        if cnt_3d and len(cnt_3d) > 0:
            # Determine the bounding rectangle

            x, y, w, h = cv2.boundingRect(np.concatenate(cnt))

            # scale contour from [micro m] to [mm]
            scale_factor = 0.001

            # transform all coordinates and generate gcode
            # for this we must apply:
            #    - the scale factor
            #    - flip them upside down (gcode coordinate system vs. openCV coordinate system)
            #
            transform_y = lambda y_coord: (-(y_coord - y) + (y + h))

            code.raise_mill()
            code.feed_rapid({"x": 0, "y": 0})
            code.start_spindle()
            for c in cnt_3d:
                i = 0
                while i < len(c):
                    p = c[i]
                    grbl_x = '{:06.4f}'.format(p[0] * scale_factor)
                    grbl_y = '{:06.4f}'.format((transform_y(p[1])) * scale_factor)
                    grbl_z = '{:06.4f}'.format(p[2] * scale_factor)
                    position_save = {"x": grbl_x, "y": grbl_y}
                    position_carving = {"x": grbl_x, "y": grbl_y, "z": grbl_z}
                    if i == 0:
                        code.feed_rapid(position_save)
                        # move close to the surface
                        code.drop_mill()
                        # carve slowly into the workpiece until the bit has reached the final depth
                        code.feed_linear({"z": grbl_z})
                    else:
                        # move to the new x/y/z coordinate
                        code.feed_linear(position_carving)
                    i += 1
                code.feed_linear({"z": 0})
                code.raise_mill()
            code.stop_spindle()
            code.feed_rapid({"x": 0, "y": 0})

        return code
