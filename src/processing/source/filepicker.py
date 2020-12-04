import os
import cv2
import base64
import numpy as np

CWD_PATH = os.path.dirname(os.path.realpath(__file__))


class FilePicker:
    def __init__(self):
        self.conf_section = None
        self.conf_file = None
        self.icon = None
        self.capture = None
        self.base64 = None
        self.image = None

    def meta(self):
        return {
            "filter": self.conf_section,
            "name":"FilePicker",
            "description":"Select an Image from your local drive",
            "parameter": "filepicker",
            "value": None,
            "icon": self.icon
        }

    def configure(self, global_conf, conf_section, conf_file):
        self.conf_section = conf_section
        self.conf_file = conf_file

    def process(self, image, cnt, code):
        return self.image, cnt, code

    def set_parameter(self, val):
        bytearray = base64.b64decode(val)
        png_as_np = np.frombuffer(bytearray, dtype=np.uint8)
        width = self.conf_file.get_int("width", self.conf_section)
        self.image = self.image_resize(cv2.imdecode(png_as_np, flags=cv2.IMREAD_COLOR), width=width)

    def image_resize(self, image, width = None, height = None, inter = cv2.INTER_AREA):
        # initialize the dimensions of the image to be resized and
        # grab the image size
        dim = None
        (h, w) = image.shape[:2]

        # if both the width and height are None, then return the
        # original image
        if width is None and height is None:
            return image

        # check to see if the width is None
        if width is None:
            # calculate the ratio of the height and construct the
            # dimensions
            r = height / float(h)
            dim = (int(w * r), height)

        # otherwise, the height is None
        else:
            # calculate the ratio of the width and construct the
            # dimensions
            r = width / float(w)
            dim = (width, int(h * r))

            # resize the image
            resized = cv2.resize(image, dim, interpolation = inter)

        # return the resized image
        return resized


    def stop(self):
        pass

