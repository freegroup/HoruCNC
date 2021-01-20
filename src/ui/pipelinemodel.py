from PySide2 import QtCore
from PySide2.QtGui import QImage
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
            if role == Qt.DisplayRole:
                return self.video_pipeline.filter(index.row()).meta()["name"]
            if role == Qt.DecorationRole:
                try:
                    return QImage(self.video_pipeline.filter(index.row()).icon_path)
                except:
                    pass

    def rowCount(self, index):
        if self.video_pipeline:
            return self.video_pipeline.filter_count()
        return 0
