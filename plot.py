import sys
import time
import numpy as np
from PySide2.QtWidgets import (
    QApplication,
    QLabel,
    QMainWindow,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from src.ui.toolpathwidget import ToolpathWidget

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.view = ToolpathWidget()
        self.setCentralWidget(self.view)


        #self.time = QtCore.QTimer()
        #self.time.timeout.connect(self.crankshaft)
        #self.time.start(0.1)
        #print("timer started")

    def crankshaft(self):
        try:
            crankshaft = np.array(([0, 0, 0],
                                   [2, 0, 0],
                                   [2,    np.cos(self.i),  np.sin(self.i)],
                                   [2.5,  np.cos(self.i),  np.sin(self.i)],
                                   [2.5, -np.cos(self.i), -np.sin(self.i)],
                                   [3,   -np.cos(self.i), -np.sin(self.i)],
                                   [3, 0, 0],
                                   [6, 0, 0]))
            conrod1 = np.array(([2.25, np.cos(self.i), np.sin(self.i)], [2.25, np.cos(self.i) + 2.5, 0]))
            conrod2 = np.array(([2.75, -np.cos(self.i), -np.sin(self.i)], [2.75, -np.cos(self.i) - 2.5, 0]))
            self.plt.setData(pos=crankshaft)
            self.plt1.setData(pos=conrod1)
            self.plt2.setData(pos=conrod2)
            self.i += 0.05

        except Exception as exc:
            print(exc)


app = QApplication(sys.argv)
main = MainWindow()
main.show()
app.exec_()
