from PySide2 import QtCore
from PySide2.QtGui import QImage, QIcon, QPixmap
from PySide2.QtCore import Qt


class PipelineModel(QtCore.QAbstractListModel):

    def __init__(self, video_pipeline=None, *args, **kwargs):
        super(PipelineModel, self).__init__(*args, **kwargs)
        self.video_pipeline = video_pipeline

    def set_pipeline(self, pipeline):
        self.video_pipeline = pipeline
        self.layoutChanged.emit()

    def data(self, index, role):
        if self.video_pipeline:
            #QVariant v = ModelBaseClass::data(index,role);
            #if role == Qt.FontRole:
            #    QFont font = v.value<QFont>();
            #    font.setBold( true );
            #   v = QVariant::fromValue<QFont>( font );
            #   return v;

            if role == Qt.DisplayRole:
                i = self.video_pipeline.filter(index.row()).index+1
                return "{:02d} - ".format(i) + self.video_pipeline.filter(index.row()).meta()["name"]
            if role == Qt.DecorationRole:
                try:
                    icon = QIcon()
                    icon.addPixmap(QPixmap.fromImage(QImage(":/all/icons/list_normal.png")), QIcon.Mode.Normal)
                    icon.addPixmap(QPixmap.fromImage(QImage(":/all/icons/list_selected.png")), QIcon.Mode.Selected)
                    return icon
                except Exception as exc:
                    print(exc)
                    pass

    def rowCount(self, index):
        if self.video_pipeline:
            return self.video_pipeline.filter_count()
        return 0
