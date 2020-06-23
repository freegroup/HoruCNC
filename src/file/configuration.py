from configparser import ConfigParser
import sys
import os

class Configuration:

    def __init__(self, inifile=None):
        if os.path.isfile(inifile) is False:
            print("unable to find configuration file [{}]".format(inifile), file=sys.stderr)
            sys.exit(1)

        self.file = inifile
        self.config = ConfigParser()
        self.config.read(self.file)


    def get_boolean(self, key, section="common"):
        return (self.get(key, section)).lower() in ("y", "yes", "true", "t", "1")

    def get_int(self, key, section="common"):
        return int(self.get(key, section))

    def get(self, key, section="common"):
        try:
            return self.config[section][key]
        except KeyError:
            print("Unable to find key [{}] in ini file [{}]".format(key, self.file),  file=sys.stderr)
            sys.exit(1)

    def set(self, key, section, value):
        self.config[section][key] = value
        with open(self.file, 'w') as configfile:
            self.config.write(configfile)

    def section(self, section="common"):
        return dict(self.config.items(section))

    def sections(self):
        return self.config.sections()
