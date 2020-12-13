import numpy as np

from utils.perf import perf_tracker

@perf_tracker()
def to_2D_contour(contour):
    if contour is None:
        return None
    return [np.array(c[:, :-1]) for c in contour]


@perf_tracker()
def ensure_3D_contour(contour):
    if contour is None:
        return None

    for i in range(len(contour)):
        c = contour[i]
        rows, columns = c.shape
        # the numpy array is already a 3D vector. skip the complete loop
        if columns == 3:
            break
        contour[i] = np.append(c, np.full((rows, 1), 0), axis=1)

    return contour