import cv2

from utils.configuration import Configuration
import os
import numpy as np
from utils.image import image_resize
from utils.contour import smooth_3D_contour

from processing.image.to_calligraphy import Filter

TEST_IMAGE = "./test-images/Jeannette_Logo.png"

configuration_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "config", "configuration.ini"))
conf = Configuration(configuration_dir)

filter = Filter()

img = cv2.imread(TEST_IMAGE, cv2.IMREAD_COLOR)
img = image_resize(img, height=600)
img1, cnt = filter.process(img, None)

smooth_3D_contour(cnt)
display_img = np.concatenate((img, img1), axis=1)

cv2.imshow('image', display_img)

cv2.waitKey(0)
cv2.destroyAllWindows()
