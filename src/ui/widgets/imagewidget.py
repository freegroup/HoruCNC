from PySide2.QtWidgets import QLabel
from PySide2 import QtGui, QtCore

class ImageWidget(QLabel):
    def __init__(self):
        super(ImageWidget, self).__init__()
        self.setFrameStyle(QtGui.QFrame.StyledPanel)
        self.setSizePolicy(QtGui.QSizePolicy.MinimumExpanding, QtGui.QSizePolicy.MinimumExpanding)
        self.pixmap = None

    def setPixmap(self, pixmap):
        self.pixmap = pixmap

    def paintEvent(self, event):
        size = self.size()
        painter = QtGui.QPainter(self)
        point = QtCore.QPoint(0,0)

        if self.pixmap:
            scaledPix = self.pixmap.scaled(size, QtCore.Qt.KeepAspectRatio, transformMode = QtCore.Qt.SmoothTransformation)
            point.setX((size.width() - scaledPix.width())/2)
            point.setY((size.height() - scaledPix.height())/2)
            # print point.x(), ' ', point.y()
            painter.drawPixmap(point, scaledPix)
