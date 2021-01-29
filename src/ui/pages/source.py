import os

from PySide2.QtUiTools import QUiLoader
from PySide2.QtWidgets import QLabel, QPushButton, QWidget, QVBoxLayout, QFileDialog
from PySide2.QtCore import QFile, Qt
from PySide2.QtGui import QImage, QPixmap, QColor

import cv2
from ui.widgets.imagewidget import ImageWidget


class SourceWidget(QWidget):

    def __init__(self, pipeline, filter, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.filter = filter
        self.pipeline = pipeline

        # Load the header file
        path = os.path.dirname(__file__)
        ui_file = QFile(os.path.join(path, "filterheader.ui"))
        ui_file.open(QFile.ReadOnly)
        loader = QUiLoader()
        self.header = loader.load(ui_file)
        ui_file.close()

        # Load the footer file
        path = os.path.dirname(__file__)
        ui_file = QFile(os.path.join(path, "sourcefooter.ui"))
        ui_file.open(QFile.ReadOnly)
        loader = QUiLoader()
        self.footer = loader.load(ui_file)
        ui_file.close()

        self.header.label_filtertitle.setText(self.filter.meta()["name"])
        self.header.label_filterdescription.setText(self.filter.meta()["description"])
        if self.filter.index+1 < 10:
            self.header.label_filterindex.setText("0"+str(self.filter.index+1))
        else:
            self.header.label_filterindex.setText(str(self.filter.index+1))

        self.image_label = ImageWidget()
        self.image_label.setScaledContents(True)

        self.footer.button_filename.clicked.connect(self.select_image)

        self.layout = QVBoxLayout()
        self.layout.setContentsMargins(0, 0, 0, 0)
        self.layout.addWidget(self.header)
        self.layout.addWidget(self.image_label)
        self.layout.addWidget(self.footer)
        self.setLayout(self.layout)

        if self.filter.path:
            self.select_image(self.filter.path)

    def select_image(self, path_to_file=None):
        if not path_to_file:
            path_to_file, _ = QFileDialog.getOpenFileName(self,
                                                          self.tr("Select Image"),
                                                          self.tr("~/Desktop/"),
                                                          self.tr("Image (*.png)"))

        if path_to_file:
            image = cv2.imread(path_to_file, cv2.IMREAD_COLOR)
            self.image_label.setImage(image)

        self.footer.edit_filename.setText(path_to_file)
        self.filter.set_parameter("path", path_to_file)
        self.pipeline.process()
