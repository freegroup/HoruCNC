import sys
from PySide2 import QtCore, QtGui, QtWidgets

class ReorderList(QtWidgets.QListWidget):

    def __init__(self, parent=None):
        super(ReorderList, self).__init__(parent)

        self.setDragDropMode(
            QtWidgets.QAbstractItemView.InternalMove
        )
        self.setAcceptDrops(True)
        self.setAlternatingRowColors(True)
        self.setSelectionMode(
            QtWidgets.QAbstractItemView.ExtendedSelection
        )

    def add_widget(self, widget=None, index=-1):
        item = QtWidgets.QListWidgetItem()
        item.setSizeHint(widget.sizeHint())
        if index < 0:
            self.addItem(item)
        else:
            self.insertItem(index, item)
        self.setItemWidget(item, widget)

    def dropEvent(self, event):
        drop_index = self.indexAt(event.pos()).row()
        if event.mimeData().hasText():
            if event.mimeData().text() == 'ReorderListAdd()':
                self.add_btn(index=drop_index)
        super(ReorderList, self).dropEvent(event)

    def dragEnterEvent(self, event):
        event.accept()

    def dragMoveEvent(self, event):
        event.accept()


class MainView(QtWidgets.QWidget):
    def __init__(self):
        super().__init__()

        self.listWidget = ReorderList()
        self.listWidget.addItems(["Item 1 1 1 ", "Item 22 22", "Item 3 33 333", ])

        self.layout = QtWidgets.QVBoxLayout(self)
        self.layout.addWidget(self.listWidget)


if __name__ == '__main__':
    app = QtWidgets.QApplication(sys.argv)
    w = MainView()
    w.show()
    sys.exit(app.exec_())