import sys

from PySide2.QtWidgets import QApplication
from PySide2 import QtCore
from PySide2.QtCore import Qt

# don't remove resource import
import ui.resources

from ui.splashscreen import SplashScreen
from ui.mainwindow import MainWindow

if __name__ == "__main__":
    QtCore.QCoreApplication.setAttribute(Qt.AA_ShareOpenGLContexts)

    app = QApplication(sys.argv)

    splash = SplashScreen()
    splash.show()

    app.exec_()

    main = MainWindow()
    main.show()

    if len(sys.argv) > 1:
        main.loadPipelinePyFile(sys.argv[1])
    else:
        main.loadPipelineByIndex(0)

    sys.exit(app.exec_())
