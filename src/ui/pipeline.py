import utils.clazz as clazz

from utils.configuration import Configuration

import os.path
import sys
import os

from utils.exit import exit_process

from PySide2.QtCore import Signal, QObject

class VideoPipeline(QObject):
    processed = Signal(object)

    def __init__(self, pipeline_file):
        QObject.__init__(self)

        self.pipeline_conf = Configuration(pipeline_file)
        self.filters = []
        self.pipeline = self.pipeline_conf.sections()

        icon_file = pipeline_file.replace(".ini", ".png")
        if os.path.isfile(icon_file):
            self.icon_path = icon_file

        # the input format for the first filter element
        input_format = None

        for pipeline_section in self.pipeline:
            # ignore the common section
            if pipeline_section == "common":
                continue
            # ignore the source section
            if pipeline_section == "source":
                continue

            instance = clazz.instance_by_name(pipeline_section, pipeline_section, self.pipeline_conf)
            instance.index = len(self.filters)

            # check that the output format if the predecessor filter matches with the input if this
            # filter
            meta = instance.meta()
            if not input_format==None and not meta["input"] == input_format:
                print("Filter '{}' is unable to process input format '{}'. Expected was '{}'".format(python_file, input_format, meta["input"]))
                print("Wrong pipeline definition. Exit")
                exit_process()

            # the output if this filter is the input of the next filter
            input_format = meta["output"]

            self.filters.append(instance)

    def meta(self):
        meta_info = []
        for instance in self.filters:
            menu = self.pipeline_conf.get_boolean("menu", instance.conf_section)
            meta = instance.meta()
            meta["menu"] = menu
            meta_info.append(meta)
        return {
            "name": self.pipeline_conf.get("name"),
            "description": self.pipeline_conf.get("description"),
            "author": self.pipeline_conf.get("author"),
            "filters": meta_info
        }

    def filter(self, index):
        return self.filters[index]

    def filter_count(self):
        return len(self.filters)

    def gcode(self, contour_3d):
        return self.filters[len(self.filters) - 1].gcode(contour_3d)

    def process(self):
        result = []
        image = None
        cnt = []

        for instance in self.filters:
            try:
                image, cnt = instance.process(image, cnt)
                result.append({"filter": instance.conf_section, "image": image, "contour": cnt})
                print("------------------------")
            except Exception as exc:
                exc_type, exc_obj, exc_tb = sys.exc_info()
                fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
                print(exc_type, fname, exc_tb.tb_lineno)
                print(type(instance), exc)

        self.processed.emit(result)

