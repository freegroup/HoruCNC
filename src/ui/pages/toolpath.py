import os
import pyqtgraph.opengl as gl

from PySide2.QtUiTools import QUiLoader
from PySide2.QtWidgets import QLabel, QWidget, QVBoxLayout, QGridLayout, QSlider, QFileDialog
from PySide2.QtCore import Qt, QFile


class ToolpathWidget(QWidget):

    def __init__(self, pipeline, filter, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.filter = filter
        self.pipeline = pipeline
        self.cnt3D = []

        # Load the header file
        path = os.path.dirname(__file__)
        ui_file = QFile(os.path.join(path, "filterheader.ui"))
        ui_file.open(QFile.ReadOnly)
        loader = QUiLoader()
        self.header = loader.load(ui_file)
        ui_file.close()


        # Load the footer file
        path = os.path.dirname(__file__)
        ui_file = QFile(os.path.join(path, "toolpathfooter.ui"))
        ui_file.open(QFile.ReadOnly)
        loader = QUiLoader()
        self.footer = loader.load(ui_file)
        ui_file.close()

        self.glWidget = gl.GLViewWidget()
        self.glWidget.opts['distance'] = 40
        xgrid = gl.GLGridItem()
        xgrid.rotate(0, 0, 1, 0)
        xgrid.scale(10, 10, 0.1)
        self.glWidget.addItem(xgrid)

        self.header.label_filtertitle.setText(self.filter.meta()["name"])
        self.header.label_filterdescription.setText(self.filter.meta()["description"])
        self.header.label_filterindex.setText("{:02}".format(self.filter.index+1))

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

        itm_cnt = len(self.glWidget.items)
        idx = itm_cnt - 1
        while idx >= 0:
            if type(self.glWidget.items[idx]) == gl.GLLinePlotItem:
                del self.glWidget.items[idx]
            idx -= 1

        for c in cnt:
            c = c/1000
            plt = gl.GLLinePlotItem(pos=c, width=2, antialias=True, color="559895")
            self.glWidget.addItem(plt)



