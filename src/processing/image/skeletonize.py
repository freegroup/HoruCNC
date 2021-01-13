import cv2
import numpy as np


class Filter:
    def __init__(self):
        self.conf_section = None
        self.conf_file = None
        self.icon = None

    def meta(self):
        return {
            "filter": self.conf_section,
            "name": "Outline",
            "description": "Skeletonize the black shapes in the image",
            "parameters": [],
            "input": "image",
            "output": "image",
            "icon": self.icon
        }

    def configure(self, global_conf, conf_section, conf_file):
        self.conf_section = conf_section
        self.conf_file = conf_file

    def process(self, image, cnt):
        image_thinned = image.copy()  # deepcopy to protect the original image
        image_thinned = cv2.threshold(image_thinned, 127, 255, cv2.THRESH_BINARY_INV)[1]
        image_thinned, _, _ = cv2.split(image_thinned)

        #image_thinned = 255 - cv2.ximgproc.thinning(image_thinned, cv2.ximgproc.THINNING_GUOHALL)
        image_thinned = 255 - cv2.ximgproc.thinning(image_thinned, cv2.ximgproc.THINNING_ZHANGSUEN)

        newimage = np.zeros(image.shape, dtype="uint8")
        newimage[:, :, 0] = image_thinned
        newimage[:, :, 1] = image_thinned
        newimage[:, :, 2] = image_thinned
        return newimage, cnt

    def stop(self):
        pass
