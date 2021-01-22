import cv2
import numpy as np
from processing.filter import BaseFilter


class Filter(BaseFilter):
    def __init__(self, conf_section, conf_file):
        BaseFilter.__init__(self, conf_section, conf_file)

    def meta(self):
        return {
            "name": "Outline",
            "description": "Skeletonize the black shapes in the image",
            "parameters": [],
            "input": "image",
            "output": "image"
        }

    def _process(self, image, cnt):
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
