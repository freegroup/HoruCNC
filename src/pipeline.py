import utils.clazz as clazz

from file.configuration import Configuration

class Pipeline:
    def __init__(self, config_file ):
        self.conf = Configuration(config_file)
        self.filters = []
        self.pipeline = self.conf.sections()
        for filter in self.pipeline:
            instance = clazz.instance_by_name(filter)
            instance.configure(filter, self.conf)
            self.filters.append(instance)

    def meta(self):
        meta_info = []
        for instance in self.filters:
            meta_info.append(instance.meta())
        return meta_info

    def filter_count(self):
        return len(self.pipeline)

    def process(self):
        result = []
        image = None
        cnt = None
        gcode = None
        for instance in self.filters:
            image, cnt, gcode = instance.process(image, cnt, gcode)
            result.append({"filter": instance.config_section, "image":image, "contour": cnt, "gcode": gcode})

        return result
