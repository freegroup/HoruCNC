import sys
import os
sys.path.append(os.path.abspath('./src'))

import cv2

from utils.configuration import Configuration
import numpy as np
from utils.image import image_resize

from processing.image.black_white import Filter as BlackWhite
from processing.image.to_line_hatch import Filter as Hatch

TEST_IMAGE = "./test-images/hatch_test.png"

configuration_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "config", "configuration.ini"))
conf = Configuration(configuration_dir)

bw = BlackWhite()
bw.threshold = 120
hatch = Hatch()

img = cv2.imread(TEST_IMAGE, cv2.IMREAD_COLOR)
img = image_resize(img, height=600)
img1=img
cnt = None

img1, cnt = bw.process(img1, cnt)
img1, cnt = hatch.process(img, cnt)

display_img = np.concatenate((img, img1), axis=1)

cv2.imshow('image', display_img)

cv2.waitKey(0)
cv2.destroyAllWindows()
