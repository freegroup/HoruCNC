import os
from os import listdir
from os.path import isfile, join, basename, splitext
from PySide2 import QtCore
from PySide2.QtCore import Qt
from utils.configuration import Configuration

configuration_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..","config", "configuration.ini"))
conf = Configuration(configuration_dir)
PIPELINE_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), "..",conf.get("pipelines")))

class PipelinesModel(QtCore.QAbstractListModel):

    def __init__(self, *args, **kwargs):
        super(PipelinesModel, self).__init__(*args, **kwargs)
        self.pipelines = []
        onlyfiles = [join(PIPELINE_FOLDER, f) for f in listdir(PIPELINE_FOLDER) if isfile(join(PIPELINE_FOLDER, f))]
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
