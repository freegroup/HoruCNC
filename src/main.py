import sys
import os


from PySide2 import QtCore

from PySide2.QtCore import Qt


# don't remove resource import
import ui.resources

# required for fbs installer
import processing

from PySide2.QtWidgets import QApplication

from ui.splashscreen import SplashScreen
from ui.mainwindow import MainWindow

if __name__ == "__main__":
    if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
        os.chdir(sys._MEIPASS)

    QtCore.QCoreApplication.setAttribute(Qt.AA_ShareOpenGLContexts)
    app = QApplication()       # 1. Instantiate ApplicationContext

    splash = SplashScreen()
    splash.show()

    app.exec_()

    main = MainWindow()
    main.show()

    if len(sys.argv) > 1:
        main.loadPipelinePyFile(sys.argv[1])
    else:
        main.loadPipelineByIndex(0)
    print("--------------------")
    print(sys.version)
    print(QtCore.qVersion())
    print("--------------------")

    exit_code = app.exec_()
    sys.exit(exit_code)

