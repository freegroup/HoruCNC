import sys
import os

from PySide2 import QtCore, QtGui, QtWidgets
from PySide2.QtGui import (QBrush, QColor, QConicalGradient, QCursor, QFont, QFontDatabase, QIcon, QKeySequence, QLinearGradient, QPalette, QPainter, QPixmap, QRadialGradient)
from PySide2.QtWidgets import QGraphicsDropShadowEffect
from PySide2.QtUiTools import QUiLoader
from PySide2.QtCore import QFile, QIODevice


class SplashScreen():
    def __init__(self, ):
        ui_file = QFile("resources/ui/splashscreen.ui")
        ui_file.open(QFile.ReadOnly)
        loader = QUiLoader()
        self.window = loader.load(ui_file)
        ui_file.close()

        if not self.window:
            print(loader.errorString())
            sys.exit(-1)

        self.window.setWindowFlag(QtCore.Qt.FramelessWindowHint)
        self.window.setAttribute(QtCore.Qt.WA_TranslucentBackground)

        ## DROP SHADOW EFFECT
        self.window.shadow = QGraphicsDropShadowEffect(self.window)
        self.window.shadow.setBlurRadius(30)
        self.window.shadow.setXOffset(0)
        self.window.shadow.setYOffset(0)
        self.window.shadow.setColor(QColor(0, 0, 0, 90))
        self.window.dropShadowFrame.setGraphicsEffect(self.window.shadow)
        self.counter = 0

        self.timer = QtCore.QTimer()
        self.timer.timeout.connect(self.progress)

    def show(self):
        self.window.show()
        self.timer.start(25)  # [ms]

    def progress(self):
        #self.window.progressBar.setValue(self.counter)
        if self.counter > 100:
            self.timer.stop()
            self.window.close()

        # INCREASE COUNTER
        self.counter += 1
