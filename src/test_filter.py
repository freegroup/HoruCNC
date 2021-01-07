import cv2

from utils.configuration import Configuration
import os
import numpy as np
from utils.image import image_resize

from processing.image.black_white import Filter as Filter1
from processing.image.skeletonize import Filter as Filter2

TEST_IMAGE = "./test-images/Jeannette_Logo.png"

configuration_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "config", "configuration.ini"))
conf = Configuration(configuration_dir)

filter1 = Filter1()
filter1.threshold = 128

filter2 = Filter2()

img = cv2.imread(TEST_IMAGE, cv2.IMREAD_COLOR)
img = image_resize(img, height=600)
img1, cnt = filter1.process(img, None)
img2, cnt = filter2.process(img1, None)


img = 255 - cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
img1 = 255 - cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
img2 = 255 - cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)

# calculate the watershed distance
#
img1 = cv2.distanceTransform(img1, cv2.DIST_L2, 5)
img1 = cv2.convertScaleAbs(img1)
img1 = cv2.normalize(img1, None, 255, 0, cv2.NORM_MINMAX, cv2.CV_8UC1)

# calculate the mask and use just the pixel and the intensity for the carving depth
#
img3 = cv2.bitwise_and(img1, img2)

# get the contour of the skeleton image
#
cnt, hierarchy = cv2.findContours(img2, cv2.RETR_TREE, cv2.CHAIN_APPROX_NONE)
img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
img3 = cv2.cvtColor(img3, cv2.COLOR_GRAY2BGR)
cv2.drawContours(img, cnt, -1, (60, 169, 242), 1)


dot_image = np.zeros(img.shape, dtype="uint8")
dot_image.fill(255)

for c in cnt:
    i = 0
    c = np.squeeze(c)
    while i < len(c):
        p = c[i]
        row = p[1]
        col = p[0]
        neighbours = img3[row-2:row+2, col-2:col+2][:, :, 0]
        max = int(np.amax(neighbours))
        print(type(max))
        cv2.circle(dot_image, (col, row), int(max/14), (60, 169, 242), -1)
        i = i+1


display_img = np.concatenate((img, img3, dot_image), axis=1)
cv2.imshow('image', display_img)
cv2.waitKey(0)
cv2.destroyAllWindows()
