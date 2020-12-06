import os
import cv2
from scanner_camera import Camera as Scanner

CWD_PATH = os.path.dirname(os.path.realpath(__file__))


class ImageSource:
    def __init__(self):
        self.conf_section = None
        self.conf_file = None
        self.icon = None
        self.capture = None
        self.factor = 2
        self.camera = None

    def meta(self):
        return {
            "filter": self.conf_section,
            "name":"Camera",
            "description":"Place the image in front of your camera and zoom in to focus",
            "parameter": "slider",
            "value": self.factor,
            "icon": self.icon
        }


    def configure(self, global_conf, conf_section, conf_file):
        self.conf_section = conf_section
        self.conf_file = conf_file

        self.factor = self.conf_file.get_int("zoom", self.conf_section)
        print("CREATE CAMERA")
        self.camera = Scanner()
        print(self.camera)

    def process(self, image, cnt, code):
        image = self.camera.capture.read()
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


    def set_parameter(self, name, val):
        self.factor = int(val)
        self.conf_file.set("zoom", self.conf_section, str(val))


    def stop(self):
        Scanner.stop()
        pass

