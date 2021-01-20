import sys
import time
import numpy as np
from PySide2 import QtCore
from PySide2.QtCore import QTimer, QRunnable, QThreadPool
from PySide2.QtWidgets import (
    QApplication,
    QLabel,
    QMainWindow,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

import pyqtgraph as pg
import pyqtgraph.opengl as gl
from pyqtgraph import PlotWidget, plot

from PySide2.QtWidgets import *


class ToolpathWidget(gl.GLViewWidget):

    def __init__(self, pipeline, filter, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.filter = filter
        self.pipeline = pipeline

        self.opts['distance'] = 40

        self.i = 0
        crankshaft = np.array((
            [0, 0, 0],
            [2, 0, 0],
            [2, np.cos(self.i), np.sin(self.i)],
            [2.5, np.cos(self.i), np.sin(self.i)],
            [2.5, -np.cos(self.i), -np.sin(self.i)],
            [3, -np.cos(self.i), -np.sin(self.i)],
            [3, 0, 0],
            [6, 0, 0]))
        self.plt = gl.GLLinePlotItem(pos=crankshaft)
        self.addItem(self.plt)

        conrod1 = np.array(([2.25, np.cos(self.i), np.sin(self.i)], [2.25, np.cos(self.i) + 2.5, 0]))
        self.plt1 = gl.GLLinePlotItem(pos=conrod1)
        self.addItem(self.plt1)

        ## create three grids, add each to the view
        xgrid = gl.GLGridItem()
        self.addItem(xgrid)

        ## rotate x and y grids to face the correct direction
        xgrid.rotate(90, 0, 1, 0)

        ## scale each grid differently
        xgrid.scale(1, 1, 0.1)

        conrod2 = np.array(([3.25, -np.cos(self.i), -np.sin(self.i)], [3.25, -np.cos(self.i) - 2.5, 0]))
        self.plt2 = gl.GLLinePlotItem(pos=conrod2)
        self.addItem(self.plt2)

