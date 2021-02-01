from processing.filter import BaseFilter

class Filter(BaseFilter):
    def __init__(self, conf_section, conf_file):
        BaseFilter.__init__(self, conf_section, conf_file)

    def meta(self):
        return {
            "name": "Invers Black&White",
            "description": "Inverts the color of the image",
            "parameters": [],
            "input": "image",
            "output": "image"
        }

    def _process(self, image, cnt):
        return (255 - image), cnt
