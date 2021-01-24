import pyqtgraph.opengl as gl

from PySide2.QtWidgets import *


class ToolpathWidget(gl.GLViewWidget):

    def __init__(self, pipeline, filter, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.filter = filter
        self.pipeline = pipeline
#        self.setStyleSheet("background-color:transparent;")

        self.opts['distance'] = 40
        xgrid = gl.GLGridItem()
        xgrid.rotate(0, 0, 1, 0)
        xgrid.scale(10, 10, 0.1)
        self.addItem(xgrid)
        self.filter.processed.connect(self.processed)

    def processed(self, image, cnt):
        itm_cnt = len(self.items)
        idx = itm_cnt - 1
        while idx >= 0:
            if type(self.items[idx]) == gl.GLLinePlotItem:
                del self.items[idx]
            idx -= 1

        for c in cnt:
            c = c/1000
            plt = gl.GLLinePlotItem(pos=c, width=2, antialias=True, color="559895")
            self.addItem(plt)



