# Straightforward implementation of the Singleton Pattern
import os
from utils.configuration import Configuration
from utils.videostream import VideoStream

configuration_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "config", "configuration.ini"))
conf = Configuration(configuration_dir)


class Camera(object):

    def __new__(cls):
        if not hasattr(cls, 'instance') or not cls.instance:
            cls.instance = super().__new__(cls)

            camera_to_use = conf.get_int("camera-scanner")
            cls.instance.capture = VideoStream(camera_to_use)
            cls.instance.capture.start()

        return cls.instance

    @classmethod
    def stop(cls):
        print("stopping camera")
        cls.instance.capture.stream.release()
