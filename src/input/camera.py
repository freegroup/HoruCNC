import os
import cv2
from utils.videostream import VideoStream

CWD_PATH = os.path.dirname(os.path.realpath(__file__))


class Camera:
    def __init__(self):
        self.config_section = None
        self.conf_file = None
        self.icon = None
        self.capture = None
        self.factor = 2

    def meta(self):
        return {
            "filter": self.config_section,
            "name":"Camera",
            "description":"Place your image below the camera and zoom in to focus your part to mill",
            "parameter": True,
            "value": self.factor,
            "icon": self.icon
        }


    def configure(self, config_section, conf_file):
        self.config_section = config_section
        self.conf_file = conf_file

        self.factor = self.conf_file.get_int("zoom", self.config_section)
        camera_to_use = self.conf_file.get_int("camera", self.config_section)
        self.capture = VideoStream(camera_to_use)
        self.capture.start()


    def process(self, image, cnt, code):
        image = self.capture.read()
        if self.factor>0:
            # map 0..255 -> 1..10
            image = self.zoom(image, 1+(5/255)*self.factor)

        return image, cnt, code


    def zoom(self, image, zoom_size):
        height, width, channels = image.shape
        new_dim = (int(zoom_size * width), int(zoom_size * height))
        image = cv2.resize(image, new_dim, interpolation = cv2.INTER_AREA)
        from_width = int(new_dim[0]/2)- int(width/2)
        to_width =from_width+width

        from_height = int(new_dim[1]/2)- int(height/2)
        to_height =from_height+height

        return image[from_height:to_height,from_width:to_width]


    def set_parameter(self, val):
        self.factor = val
        self.conf_file.set("zoom", self.config_section, str(val))


    def stop(self):
        self.capture.stop()

