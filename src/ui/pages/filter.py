import os

from PySide2.QtUiTools import QUiLoader
from PySide2.QtWidgets import QLabel, QWidget, QVBoxLayout, QGridLayout, QSlider
from PySide2.QtGui import QImage, QPixmap
from PySide2.QtCore import Qt, QFile

from ui.widgets.imagewidget import ImageWidget


class FilterWidget(QWidget):

    def __init__(self, pipeline, filter, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.filter = filter
        self.pipeline = pipeline
#        self.setStyleSheet("background-color:transparent;")

        # Load the header file
        path = os.path.dirname(__file__)
        ui_file = QFile(os.path.join(path, "filterheader.ui"))
        ui_file.open(QFile.ReadOnly)
        loader = QUiLoader()
        self.header = loader.load(ui_file)

        # Load the footer file
        path = os.path.dirname(__file__)
        ui_file = QFile(os.path.join(path, "filterfooter.ui"))
        ui_file.open(QFile.ReadOnly)
        loader = QUiLoader()
        self.footer = loader.load(ui_file)
        ui_file.close()

        self.header.label_filtertitle.setText(self.filter.meta()["name"])
        self.header.label_filterdescription.setText(self.filter.meta()["description"])
        ui_file.close()

        self.image_label = ImageWidget()
        self.image_label.setScaledContents(True)

        self.layout = QVBoxLayout()
        self.layout.setContentsMargins(0, 0, 0, 0)
        self.layout.addWidget(self.header)
        self.layout.addWidget(self.image_label)
        self.layout.addWidget(self.footer)
        self.setLayout(self.layout)


        self.show_parameters()

        self.filter.processed.connect(self.processed)

    def show_parameters(self):
        self.param_widget = QWidget()
        self.param_layout = QGridLayout()
        self.param_layout.setContentsMargins(0, 0, 0, 0)
        self.param_widget.setLayout(self.param_layout)
        self.footer.layout().addWidget(self.param_widget)

        meta = self.filter.meta()
        # self.sliders = []
        row = 0
        for param in meta["parameters"]:
            label = QLabel()
            label.setText(param["label"])
            slider = QSlider(Qt.Horizontal)
            slider.setMinimum(int(param["min"]))
            slider.setMaximum(int(param["max"]))
            slider.setValue(int(param["value"]))
            # https://www.learnpyqt.com/tutorials/transmitting-extra-data-qt-signals/
            # use named params to create a new closure for the lambda function
            name = param["name"]
            slider.valueChanged.connect(lambda x, key=name: self.filter.set_parameter(key, x))

            self.param_layout.addWidget(label, row, 0)
            self.param_layout.addWidget(slider, row, 1)
            row = row + 1

    def processed(self, image, cnt):
        self.image_label.setImage(image)
