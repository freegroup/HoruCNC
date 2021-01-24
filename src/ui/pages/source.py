import os

from PySide2.QtUiTools import QUiLoader
from PySide2.QtWidgets import QLabel, QPushButton, QWidget, QVBoxLayout, QFileDialog
from PySide2.QtCore import QFile, Qt

import cv2
from ui.widgets.imagewidget import ImageWidget


class SourceWidget(QWidget):

    def __init__(self, pipeline, filter, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.filter = filter
        self.pipeline = pipeline

        #        self.setStyleSheet("background-color:transparent;")
        #        self.setAttribute(Qt.WA_NoSystemBackground)
        #        self.setAttribute(Qt.WA_TranslucentBackground)

        # Load the header file
        path = os.path.dirname(__file__)
        ui_file = QFile(os.path.join(path, "filterheader.ui"))
        ui_file.open(QFile.ReadOnly)
        loader = QUiLoader()
        self.header = loader.load(ui_file)
        self.header.label_filtertitle.setText(self.filter.meta()["name"])
        self.header.label_filterdescription.setText(self.filter.meta()["description"])
        ui_file.close()

        # Load the footer file
        path = os.path.dirname(__file__)
        ui_file = QFile(os.path.join(path, "filterfooter.ui"))
        ui_file.open(QFile.ReadOnly)
        loader = QUiLoader()
        self.footer = loader.load(ui_file)
        ui_file.close()

        self.image_label = ImageWidget()
        self.image_label.setScaledContents(True)

        self.select_button = QPushButton("Select..")
        self.select_button.clicked.connect(self.select_image)

        self.layout = QVBoxLayout()
        self.layout.setContentsMargins(0, 0, 0, 0)
        self.layout.addWidget(self.header)
        self.layout.addWidget(self.image_label)
        self.layout.addWidget(self.footer)
        self.footer.layout().addWidget(self.select_button)
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

        self.filter.set_parameter("path", path_to_file)
        self.pipeline.process()
