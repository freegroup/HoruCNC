import numpy as np
import cv2
import scipy.stats as st

from utils.contour import ensure_3D_contour, to_2D_contour, contour_into_image


class Filter:
    def __init__(self):
        self.conf_section = None
        self.conf_file = None
        self.icon = None
        self.window = 20

    def meta(self):

        return {
            "filter": self.conf_section,
            "name": "Smooth Contour",
            "description": "Smooth the contour with an gaussian convolve kernel",
            "parameters": [
                {
                    "name": "window",
                    "label": "Neighbours",
                    "type": "slider",
                    "min": 3,
                    "max": "30",
                    "value": self.window
                }
            ],
            "input": "contour",
            "output": "contour",
            "icon": self.icon
        }

    def configure(self, global_conf, conf_section, conf_file):
        self.conf_section = conf_section
        self.conf_file = conf_file
        self.window = self.conf_file.get_int("window", self.conf_section)

    def process(self, image, cnt_3d):
        if len(cnt_3d) > 0:

            def gauss_kernel(kernlen=21, nsig=3):
                x = np.linspace(-nsig, nsig, kernlen)
                kern1d = np.diff(st.norm.cdf(x))
                return kern1d/kern1d.sum()

            # repeat and insert the first and last value in the array n-times
            # (expand the array at the beginning and end). Required for convolve function.
            #
            add_padding = lambda array, n: np.insert(np.insert(array, 0, np.full(n, array[0])), -1, np.full(n, array[-1]))

            box = gauss_kernel(self.window)
            padding = int(self.window/2)
            smoothed_cnt = []

            for c in cnt_3d:
                x, y, z = c.T
                if len(z) > 0:
                    if len(z) > self.window:
                        x_new = np.convolve(add_padding(x, padding), box, mode="valid")
                        y_new = np.convolve(add_padding(y, padding), box, mode="valid")
                        z_new = np.convolve(add_padding(z, padding), box, mode="valid")
                        # replace the starting points and end points of the CNC contour with the original points.
                        # We don't want modify the start / end of an contour. The reason for that is, that this is normaly
                        # cut-into movement into the stock without any tolerances. So - don't modify them.
                        #
                        # Replace the START Points with the original one
                        x_new[0:padding] = x[0:padding]
                        y_new[0:padding] = y[0:padding]
                        z_new[0:padding] = z[0:padding]
                        # Replace the END Points with the original one
                        x_new[-padding:] = x[-padding:]
                        y_new[-padding:] = y[-padding:]
                        z_new[-padding:] = z[-padding:]

                        smoothed_cnt.append(np.asarray([[int(i[0]), int(i[1]), int(i[2])] for i in zip(x_new, y_new, z_new)]))
                    else:
                        smoothed_cnt.append(c)

            # generate a preview image
            #
            preview_image = np.zeros(image.shape, dtype="uint8")
            preview_image.fill(255)

            # generate a preview contour
            #
            preview_cnt = contour_into_image(to_2D_contour(smoothed_cnt), preview_image)

            # draw the centered contour
            cv2.drawContours(preview_image, preview_cnt, -1, (60, 169, 242), 1)

            image = preview_image
            cnt_3d = smoothed_cnt

        return image, cnt_3d

    def centered_contour(self, cnt, width, height):
        pass

    def set_parameter(self, name, val):
        if name == "window":
            self.window = int(val)
            self.conf_file.set("window", self.conf_section, str(self.window))

    def stop(self):
        pass
