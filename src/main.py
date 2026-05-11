import sys
import os
import io
import os.path
import tempfile

# required to find the right packages and resources in the extracted directory of PyInstaller
#
if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    os.chdir(sys._MEIPASS)


DEBUG = True

if DEBUG:
    fp = tempfile.NamedTemporaryFile(delete=False)
    print(fp.name)
    sys.stdout = io.TextIOWrapper(fp, write_through=True)
    sys.stderr = sys.stdout

from PySide6 import QtCore
from PySide6.QtWidgets import QMessageBox, QApplication
from PySide6.QtCore import Qt

# don't remove resource import
import ui.resources

# required for fbs installer
import processing
import OpenGL
#import OpenGL_accelerate


from ui.splashscreen import SplashScreen
from ui.mainwindow import MainWindow

if __name__ == "__main__":
    QtCore.QCoreApplication.setAttribute(Qt.AA_ShareOpenGLContexts)
    app = QApplication()

    splash = SplashScreen()
    splash.show()

    app.exec()

    if DEBUG:
        QMessageBox.warning(None, app.tr("HoruCNC"),
                        app.tr(fp.name),
                        QMessageBox.Close)

    # check that the resources has been extracted. Otherwise we
    # are running direct from the "*.dmg" image -which is not supported-
    #
    if not os.access("resources/config/configuration.ini", os.W_OK|os.R_OK):
        QMessageBox.warning(None, app.tr("HoruCNC"),
                            app.tr("Running from DMG Image is not supported.\n" + \
                                   "Copy HoruCNC to your application folder"),
                            QMessageBox.Close)
    else:
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
        exit_code = app.exec()
        sys.exit(exit_code)

