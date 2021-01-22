from PySide2.QtWidgets import QLabel, QPushButton, QWidget, QVBoxLayout, QFileDialog
from PySide2.QtGui import QImage, QPixmap

from ui.widgets.imagewidget import ImageWidget


class FilterWidget(QWidget):

    def __init__(self, pipeline, filter, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.filter = filter
        self.pipeline = pipeline

        self.image_label = ImageWidget()
        self.image_label.setScaledContents(True)

#        self.select_button = QPushButton("Select..")
#        self.select_button.clicked.connect(self.select_image)

        self.layout = QVBoxLayout()
        self.layout.addWidget(self.image_label)
#        self.layout.addWidget(self.select_button)
        self.setLayout(self.layout)

        self.filter.processed.connect(self.processed)

    def processed(self, image, cnt):
        image = QImage(image, image.shape[1], image.shape[0],
                       image.strides[0], QImage.Format_RGB888)
        self.image_label.setPixmap(QPixmap.fromImage(image))



