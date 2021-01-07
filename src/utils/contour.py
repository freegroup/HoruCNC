import numpy as np
import cv2
import sys
import os

from utils.perf import perf_tracker

def normalize_contour(cnt):
    i = 0
    validated_cnt = []
    while i < len(cnt):
        c = cnt[i]
        sq_cnt = np.squeeze(c)
        if len(sq_cnt.shape) == 2:
            sq_cnt = np.append(sq_cnt, [[sq_cnt[0][0], sq_cnt[0][1]]], axis=0)
            validated_cnt.append(sq_cnt)
        i += 1
    return validated_cnt

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


def contour_into_image(cnt, image):
    try:
        image_height, image_width = image.shape[0], image.shape[1]
        x, y, w, h = cv2.boundingRect(np.concatenate(cnt))
        drawing_factor_w = (image_width / w) * 0.90
        drawing_factor_h = (image_height / h) * 0.90

        # ensure that the drawing fits into the preview image
        #
        drawing_factor = drawing_factor_w if drawing_factor_w < drawing_factor_h else drawing_factor_h
        cnt = [np.multiply(c, [drawing_factor, drawing_factor], dtype=np.float64) for c in cnt]

        # shift the cnt into the center of the image
        #
        offset_x = ((image_width / 2) - (w / 2 + x) * drawing_factor)
        offset_y = ((image_height / 2) - (h / 2 + y) * drawing_factor)
        cnt = [np.add(c, [offset_x, offset_y], dtype=np.float64).astype(np.int32) for c in cnt]

        return cnt
    except Exception as exc:
        exc_type, exc_obj, exc_tb = sys.exc_info()
        fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
        print(exc_type, fname, exc_tb.tb_lineno)


