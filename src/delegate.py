from PySide2 import QtCore, QtGui
from PySide2.QtWidgets import QStyledItemDelegate, QApplication, QListView, QSpinBox, QWidget, QVBoxLayout, QLabel

class ItemWidget(QWidget):
    def __init__(self,*args, **kwargs):
        super().__init__(*args, **kwargs)

        self.param_layout = QVBoxLayout()
        self.setLayout(self.param_layout)
        self.label = QLabel()
        self.label.setText("Label")
        self.param_layout.addWidget(self.label)


class SpinBoxDelegate(QStyledItemDelegate):
    def __init__(self,*args, **kwargs):
        super().__init__(*args, **kwargs)
        self.widget = ItemWidget()

    def paint(self, painter, option, index):
        print(type(index.data()))
        self.widget.label.setText("....."+str(index.data()))
        self.widget.paint(painter, option.rect, option.palette)
        #QStyledItemDelegate.paint(self, painter, option, index)

    def sizeHint(self, option, index):
        self.widget.label.setText("....."+str(index.data()))
        return self.widget.sizeHint()



if __name__ == '__main__':

    import sys

    app = QApplication(sys.argv)

    model = QtGui.QStandardItemModel(4, 2)
    tableView = QListView()
    tableView.setModel(model)

    delegate = SpinBoxDelegate()
    tableView.setItemDelegate(delegate)

    for row in range(4):
        for column in range(2):
            index = model.index(row, column, QtCore.QModelIndex())
            model.setData(index, (row + 1) * (column + 1))

    tableView.setWindowTitle("Spin Box Delegate")
    tableView.show()
    sys.exit(app.exec_())