import sys

from PySide2.QtGui  import QColor
from PySide2.QtUiTools import QUiLoader
from PySide2.QtCore import QFile, QIODevice, QPoint, QObject, Qt
from PySide2.QtWidgets import QVBoxLayout, QFileDialog, QWidget, QMainWindow, QGraphicsDropShadowEffect
from PySide2 import QtCore

from ui.pages.source import SourceWidget
from ui.pages.filter import FilterWidget
from ui.pages.toolpath import ToolpathWidget

from ui.pipelinemodel import PipelineModel
from ui.pipelinesmodel import PipelinesModel

from ui.utils import clickable
from ui.pipeline import VideoPipeline


class MainWindow(QMainWindow):
    def __init__(self,):
        super().__init__()

        ui_file = QFile("resources/ui/mainwindow.ui")
        ui_file.open(QFile.ReadOnly)
        loader = QUiLoader()
        self.window = loader.load(ui_file)
        ui_file.close()

        if not self.window:
            print(loader.errorString())
            sys.exit(-1)

        # create the Model for the filters within the loaded pipeline
        #
        def select_callback(window, i):
            window.pages_widget.setCurrentIndex(i.row())
            window.list_filters.repaint()

        self.pipeline_model = PipelineModel()
        self.window.list_filters.setModel(self.pipeline_model)
        self.selModel = self.window.list_filters.selectionModel()
        self.selModel.currentRowChanged.connect(lambda i: select_callback(self.window, i))

        self.setCentralWidget(self.window.centralwidget)
        self.setMinimumSize(950, 700)

        self.window.shadow = QGraphicsDropShadowEffect()
        self.window.shadow.setBlurRadius(20)
        self.window.shadow.setXOffset(10)
        self.window.shadow.setYOffset(10)
        self.window.shadow.setColor(QColor(255, 120, 0, 120))
        self.window.frame_left_menu.setGraphicsEffect(self.window.shadow)

        self.window.combobox_pipelines.currentIndexChanged.connect(self.loadPipelineByIndex)

        # create the model for all pipelines
        #
        self.pipelines_model = PipelinesModel()
        self.window.combobox_pipelines.setModel(self.pipelines_model)


    def mousePressEvent(self, event):
        self.oldPos = event.globalPos()

    def mouseMoveEvent(self, event):
        if self.window.topBar.rect().contains(event.pos()):
            delta = QPoint(event.globalPos() - self.oldPos)
            self.move(self.x() + delta.x(), self.y() + delta.y())
            self.oldPos = event.globalPos()

    def loadPipelineByIndex(self, value):
        self.loadPipelineByFile(self.pipelines_model.filename(value))

    def loadPipelineByFile(self, path_to_file=None):
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
                        self.window.pages_widget.addWidget(ToolpathWidget( self.pipeline, filter))
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
            #self.window.label_pipelinetitle.setText(self.pipeline.meta()["name"])
            self.window.label_pipelinedesc.setText(self.pipeline.meta()["description"])

