import os
import numpy as np
import pyqtgraph.opengl as gl
import cv2

from PySide2.QtUiTools import QUiLoader
from PySide2.QtWidgets import QLabel, QWidget, QVBoxLayout, QGridLayout, QSlider, QFileDialog
from PySide2.QtCore import Qt, QFile
from utils.contour import to_2D_contour


class ToolpathWidget(QWidget):

    def __init__(self, appctxt, pipeline, filter, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.filter = filter
        self.pipeline = pipeline
        self.cnt3D = []

        # Load the header file
        path = os.path.dirname(__file__)
        ui_file = QFile(appctxt.get_resource("ui/filterheader.ui"))
        ui_file.open(QFile.ReadOnly)
        loader = QUiLoader()
        self.header = loader.load(ui_file)
        ui_file.close()

        # Load the footer file
        path = os.path.dirname(__file__)
        ui_file = QFile(appctxt.get_resource("ui/toolpathfooter.ui"))
        ui_file.open(QFile.ReadOnly)
        loader = QUiLoader()
        self.footer = loader.load(ui_file)
        ui_file.close()

        self.glWidget = gl.GLViewWidget()
        self.glWidget.opts['distance'] = 90
        self.glWidget.opts['fov'] = 60  ## horizontal field of view in degrees
        self.glWidget.opts['elevation'] = 30  ## camera's angle of elevation in degrees
        self.glWidget.opts['azimuth'] = -80  ## camera's azimuthal angle in degrees
        self.glWidget.setBackgroundColor("FFFFFF")

        xgrid = gl.GLGridItem(color=(55, 55, 55, 80))
        xgrid.rotate(0, 0, 1, 0)
        xgrid.scale(10, 10, 0.1)
        self.glWidget.addItem(xgrid)

        self.header.label_filtertitle.setText(self.filter.meta()["name"])
        self.header.label_filterdescription.setText(self.filter.meta()["description"])
        self.header.label_filterindex.setText("{:02}".format(self.filter.index + 1))

        self.filter.processed.connect(self.processed)
        self.footer.button_save.clicked.connect(self.save_as)

        self.layout = QVBoxLayout()
        self.layout.setContentsMargins(0, 0, 0, 0)
        self.layout.setSpacing(0)
        self.layout.addWidget(self.header)
        self.layout.addWidget(self.glWidget)
        self.layout.addWidget(self.footer)
        self.setLayout(self.layout)

    def save_as(self):
        save_filename = QFileDialog.getSaveFileName(self,
                                                    self.tr("Save File..."),
                                                    self.tr("filename.nc"),
                                                    "GCODE files (*.nc;;All Files (*)")
        if save_filename[0]:
            with open(save_filename[0], 'w') as out:
                out.write(self.filter.gcode(self.cnt3D).to_string() + '\n')

    def processed(self, image, cnt):
        self.cnt3D = cnt
        if len(cnt) == 0:
            return

        #  flip them upside down (gcode coordinate system vs. openCV coordinate system)
        cnt2D = to_2D_contour(cnt)
        x, y, w, h = cv2.boundingRect(np.concatenate(cnt2D))
        transform_y = lambda y_coord: (-(y_coord - y) + (y + h))
        cnt = ([np.array([[p[0], transform_y(p[1]), p[2]] for p in c]) for c in cnt])

        itm_cnt = len(self.glWidget.items)
        idx = itm_cnt - 1
        while idx >= 0:
            if type(self.glWidget.items[idx]) == gl.GLLinePlotItem:
                del self.glWidget.items[idx]
            idx -= 1

        feed_rate = self.filter.feed_rate
        clearance = self.filter.clearance
        # Travel Toolpaths
        first_up = [0, 0, clearance]
        first_down = [0, 0, 0]

        plt = gl.GLLinePlotItem(pos=np.array([[0, 0, 0], [50, 0, 0]]), width=4, antialias=True, color="0000ff")
        self.glWidget.addItem(plt)

        plt = gl.GLLinePlotItem(pos=np.array([[0, 0, 0], [0, 50, 0]]), width=4, antialias=True, color="FF0000")
        self.glWidget.addItem(plt)

        # Carving Toolpaths
        for c in cnt:
            c = c / 1000
            plt = gl.GLLinePlotItem(pos=c, width=2, antialias=True, color="ECB151")
            self.glWidget.addItem(plt)

            # Tool Movement to start
            next_down = c[:1][0].tolist()  # first element
            next_up = [next_down[0], next_down[1], clearance]  # first element
            path = np.array([first_down, first_up, next_up, next_down])
            plt = gl.GLLinePlotItem(pos=path, width=1, antialias=True, color="3f3f3f3A")
            self.glWidget.addItem(plt)

            first_down = c[-1:][0].tolist()
            first_up = [first_down[0], first_down[1], clearance]
