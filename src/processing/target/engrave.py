import serial

class Filter:
    def __init__(self):
        self.config_section = None
        self.conf_file = None
        self.icon = None
        self.gcode = None
        self.serial = None
        self.port = None
        self.baud = None

    def meta(self):
        return {
            "filter": self.config_section,
            "name":" Carve Contour",
            "description":"Carves the contour",
            "parameter": True,
            "icon": self.icon
        }

    def configure(self, config_section, conf_file):
        self.config_section = config_section
        self.conf_file = conf_file

        self.port = self.conf_file.get("port", self.config_section)
        self.baud = self.conf_file.get_int("baud", self.config_section)
        self.serial = serial.Serial(self.port,self.baud)


    def process(self, image, cnt, code):
            try:
                if code:
                    self.gcode = code
            except Exception as exc:
                print(exc)

            return image, cnt, code


    def set_parameter(self, val):
        pass


    def stop(self):
        pass

