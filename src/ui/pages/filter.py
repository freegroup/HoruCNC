from PySide2.QtWidgets import (
    QApplication,
    QLabel,
    QMainWindow,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from PySide2.QtWidgets import *


class FilterWidget(QWidget):

    def __init__(self, pipeline, filter, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.filter = filter
        self.pipeline = pipeline

        self.image_label = QLabel()
        #self.image_label.setFixedSize(self.video_size)

        self.select_button = QPushButton("AAAAAA..")
        #self.quit_button.clicked.connect(self.close)

        self.layout = QVBoxLayout()
        self.layout.addWidget(self.image_label)
        self.layout.addWidget(self.select_button)
        self.setLayout(self.layout)


