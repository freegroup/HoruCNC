import time
import sys
import os
import inspect

from PySide2.QtCore import Signal, QObject

from utils.contour import ensure_3D_contour


class BaseFilter(QObject):
    processed = Signal(object, object)
    param_changed = Signal()

    def __init__(self, conf_section, conf_file):
        QObject.__init__(self)

        self.conf_section = conf_section
        self.conf_file = conf_file
        self.icon_path = None
        # try to load an Icon for this kind of filter
        python_file = inspect.getfile(self.__class__)
        icon_file = python_file.replace(".py", ".png")
        if os.path.isfile(icon_file):
            self.icon_path = icon_file

        self.last_result = {"image": None, "contour": None}

    def _process(self, image, contour):
        raise NotImplementedError

    def _set_parameter(self, name, value):
        raise NotImplementedError


    def set_parameter(self, name, value):
        self._set_parameter(name, value)
        self.param_changed.emit()

    def process(self, image, cnt):
        start = time.process_time()
        try:
            print("Running filter: ", type(self))
            image, cnt = self._process(image, cnt)
            end = time.process_time()
            print(self.meta()["name"], end - start)
            print("Contour Count:", len(cnt))
            cnt = ensure_3D_contour(cnt)

            if image is None:
                print("unable to read image from filter: " + self.meta()["name"])
            elif len(image.shape) != 3:
                print("Image must have 3 color channels. Filter '{}' must return RGB image".format(instance.conf_section))

            self.processed.emit(image, cnt)

        except Exception as exc:
            exc_type, exc_obj, exc_tb = sys.exc_info()
            fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
            print(exc_type, fname, exc_tb.tb_lineno)
            print(type(self), exc)

        return image, cnt

    def _set_parameter(self, name, val):
        pass

