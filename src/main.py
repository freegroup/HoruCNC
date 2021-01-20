import sys

from PySide2.QtWidgets import QApplication

# don't remove resource import
import ui.resources

from ui.splashscreen import SplashScreen
from ui.mainwindow import MainWindow

if __name__ == "__main__":
    app = QApplication(sys.argv)

    splash = SplashScreen()
    splash.show()

    app.exec_()

    main = MainWindow()
    main.show()

    if len(sys.argv)>1:
        main.loadPipeline(sys.argv[1])

    sys.exit(app.exec_())
