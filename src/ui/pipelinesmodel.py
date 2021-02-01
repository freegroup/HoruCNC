from os import listdir
from os.path import isfile, join, basename, splitext
from PySide2 import QtCore
from PySide2.QtCore import Qt
from utils.configuration import Configuration


class PipelinesModel(QtCore.QAbstractListModel):

    def __init__(self, *args, **kwargs):
        super(PipelinesModel, self).__init__(*args, **kwargs)
        pipeline_folder = "resources/pipelines"
        self.pipelines = []
        onlyfiles = [join(pipeline_folder, f) for f in listdir(pipeline_folder) if isfile(join(pipeline_folder, f))]
        for f in onlyfiles:
            if not f.endswith(".ini"):
                continue
            pipeline_conf = Configuration(f)

            pipeline_metadata = {
                "filename": f,
                "basename": splitext(basename(f))[0],
                "name": pipeline_conf.get("name"),
                "description": pipeline_conf.get("description"),
                "author": pipeline_conf.get("author")
            }
            self.pipelines.append(pipeline_metadata)

    def filename(self, index):
        return self.pipelines[index]["filename"]

    def data(self, index, role):
        if self.pipelines:
            if role == Qt.DisplayRole:
                return self.pipelines[index.row()]["name"]

    def rowCount(self, index):
        if self.pipelines:
            return len(self.pipelines)
        return 0
