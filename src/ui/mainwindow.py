import sys
import os

from PySide2.QtUiTools import QUiLoader
from PySide2.QtCore import QFile, QIODevice, QPoint, QObject, Qt
from PySide2.QtWidgets import QVBoxLayout, QFileDialog, QWidget, QMainWindow
from PySide2 import QtCore
from PySide2.QtGui import QImage, QPixmap

from ui.pages.source import SourceWidget
from ui.pages.filter import FilterWidget
from ui.pages.toolpath import ToolpathWidget

from ui.pipelinemodel import PipelineModel

from ui.utils import clickable
from ui.pipeline import VideoPipeline


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        path = os.path.dirname(__file__)
        ui_file = QFile(os.path.join(path, "mainwindow.ui"))
        ui_file.open(QFile.ReadOnly)
        loader = QUiLoader()
        self.window = loader.load(ui_file)

        if not self.window:
            print(loader.errorString())
            sys.exit(-1)

        self.setCentralWidget(self.window.centralwidget)
        self.setMinimumSize(950, 700)

        self.window.button_select_pipeline.clicked.connect(lambda: self.loadPipeline())

        self.pipeline_model = PipelineModel()
        self.window.list_filters.setModel(self.pipeline_model)
        self.selModel = self.window.list_filters.selectionModel()
        self.selModel.currentRowChanged.connect(lambda i: self.window.pages_widget.setCurrentIndex(i.row()))

    def mousePressEvent(self, event):
        self.oldPos = event.globalPos()

    def mouseMoveEvent(self, event):
        if self.window.topBar.rect().contains(event.pos()):
            delta = QPoint(event.globalPos() - self.oldPos)
            self.move(self.x() + delta.x(), self.y() + delta.y())
            self.oldPos = event.globalPos()

    def loadPipeline(self, path_to_file=None):
        if not path_to_file:
            path_to_file, _ = QFileDialog.getOpenFileName(self.window,
                                                          self.window.tr("Load Pipeline"),
                                                          self.window.tr("~/Desktop/"),
                                                          self.window.tr("Pipelines (*.ini)"))

        if path_to_file:
            try:
                self.pipeline = VideoPipeline(path_to_file)
                self.pipeline_model.set_pipeline(self.pipeline)

                # remove all stack pages
                #
                for _ in range(self.window.pages_widget.count()):
                    self.window.pages_widget.removeWidget(self.window.pages_widget.widget(0))

                # add a new widget to the stack for each filter
                #
                for filter in self.pipeline.filters:
                    if filter.meta()["input"] == "filepicker":
                        self.window.pages_widget.addWidget(SourceWidget(self.pipeline, filter))
                    elif filter.meta()["output"] == "gcode":
                        self.window.pages_widget.addWidget(ToolpathWidget(self.pipeline, filter))
                    else:
                        self.window.pages_widget.addWidget(FilterWidget(self.pipeline, filter))

                ix = self.pipeline_model.index(0, 0)
                self.window.list_filters.selectionModel().select(ix, QtCore.QItemSelectionModel.SelectCurrent)

                self.update_header()
                self.pipeline.process()
            except Exception as exc:
                print("invalid pipeline configuration", exc)

    def update_header(self):
        if self.pipeline:
            self.window.label_pipelinetitle.setText(self.pipeline.meta()["name"])
            self.window.label_pipelinedesc.setText(self.pipeline.meta()["description"])
            self.window.label_pipelinedesc.setText(self.pipeline.meta()["description"])
            image = QImage(self.pipeline.icon_path)
            # self.window.label_pipelineicon.setPixmap(QPixmap.fromImage(image))
