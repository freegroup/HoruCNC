from fbs_runtime.application_context.PySide2 import ApplicationContext

import sys

from PySide2 import QtCore
from PySide2.QtCore import Qt


# don't remove resource import
import ui.resources

# required for fbs installer
import processing

from ui.splashscreen import SplashScreen
from ui.mainwindow import MainWindow

if __name__ == "__main__":
    QtCore.QCoreApplication.setAttribute(Qt.AA_ShareOpenGLContexts)
    appctxt = ApplicationContext()       # 1. Instantiate ApplicationContext


    sys.stdout = open(appctxt.get_resource("logging/log.txt"), "w")
    sys.stderr = sys.stdout

    splash = SplashScreen(appctxt)
    splash.show()

    appctxt.app.exec_()

    main = MainWindow(appctxt)
    main.show()

    if len(sys.argv) > 1:
        main.loadPipelinePyFile(sys.argv[1])
    else:
        main.loadPipelineByIndex(0)

    exit_code = appctxt.app.exec_()
    sys.exit(exit_code)

