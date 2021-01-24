from PySide2.QtWidgets import QLabel
from PySide2 import QtGui, QtCore
from PySide2.QtCore import  Qt
from utils.image import image_resize
from PySide2.QtGui import QImage, QPixmap
import cv2

class ImageWidget(QLabel):
    def __init__(self):
        super(ImageWidget, self).__init__()
        self.setFrameStyle(QtGui.QFrame.StyledPanel)
        self.setSizePolicy(QtGui.QSizePolicy.MinimumExpanding, QtGui.QSizePolicy.MinimumExpanding)
        self.setAttribute(Qt.WA_NoSystemBackground)
        self.setAttribute(Qt.WA_TranslucentBackground, True)
        self.setAttribute(Qt.WA_NoSystemBackground, True)

        self.image = None

    def setImage(self, image):
        self.image = image
        self.repaint()

    def paintEvent(self, event):

        def scale_height(current_width, current_height, max_width, max_height):
            width_percent = max_width / current_width
            height_percent = max_height / current_height
            percent = height_percent if height_percent < width_percent else  width_percent
            return current_height * percent

        if not self.image is None:
            w, h, channels = self.image.shape
            canvas_size = self.size()
            new_height = int(scale_height(w, h, canvas_size.width(), canvas_size.height()))
            # scale the image with OpenCV instead of Qt. The result is much better
            # e.g. one pixel line are not dropped in the OpenCV version
            #image = image_resize(self.image, height=new_height, inter=cv2.INTER_NEAREST)
            image = image_resize(self.image, height=new_height, inter=cv2.INTER_LINEAR)

            image = QImage(image, image.shape[1], image.shape[0],
                           image.strides[0], QImage.Format_RGB888)
            pixmap = QPixmap.fromImage(image)

            painter = QtGui.QPainter(self)
            point = QtCore.QPoint(0,0)

            point.setX((canvas_size.width() - pixmap.width())/2)
            point.setY((canvas_size.height() - pixmap.height())/2)
            painter.drawPixmap(point, pixmap)
