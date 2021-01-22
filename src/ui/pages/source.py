from PySide2.QtWidgets import QLabel, QPushButton, QWidget, QVBoxLayout, QFileDialog
from PySide2.QtGui import QImage, QPixmap
import cv2
from ui.widgets.imagewidget import ImageWidget


class SourceWidget(QWidget):

    def __init__(self, pipeline, filter, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.filter = filter
        self.pipeline = pipeline

        self.image_label = ImageWidget()
        self.image_label.setScaledContents(True)

        self.select_button = QPushButton("Select..")
        self.select_button.clicked.connect(self.select_image)

        self.layout = QVBoxLayout()
        self.layout.addWidget(self.image_label)
        self.layout.addWidget(self.select_button)
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
            image = QImage(image, image.shape[1], image.shape[0],
                           image.strides[0], QImage.Format_RGB888)
            self.image_label.setPixmap(QPixmap.fromImage(image))

        self.filter.set_parameter("path", path_to_file)
        self.pipeline.process()



