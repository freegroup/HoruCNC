from pydoc import locate


def instance_by_name( name, *argv):
    Clazz = locate(name)
    if Clazz is None:
        print("Class '{}' not found.".format(name))

    return Clazz(*argv)
