from grbl import GCode

class Filter:
    def __init__(self):
        self.config_section = None
        self.conf_file = None

    def meta(self):
        return {
            "filter": self.config_section,
            "name":" Outline GRBL",
            "description":"Generates GRBL Code of the contour",
            "params": []
        }

    def configure(self, config_section, conf_file):
        self.config_section = config_section
        self.conf_file = conf_file

    def process(self, image, cnt, code):
        code = GCode()
        width, height, channel = image.shape
        for c in cnt:
            i = 0
            while i < len(c):
                p = c[i]
                if i == 0:
                    code.feed_rapid({"x":p[0] , "y":(height - p[1])})
                    code.drop_mill()
                else:
                    code.feed_linear({"x":p[0], "y":(height - p[1])})

                i+=1

            code.feed_linear({"x":(c[0][0]) ,"y": (height - c[0][1])})
            code.raise_mill()

        return image, cnt, code