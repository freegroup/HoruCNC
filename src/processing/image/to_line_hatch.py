import cv2
import numpy as np
import sys
import os
import pyclipper

from utils.contour import ensure_3D_contour, to_2D_contour, contour_into_image, normalize_contour


class Filter:
    def __init__(self):
        self.conf_section = None
        self.conf_file = None
        self.icon = None
        self.width_in_micro_m = 20000
        self.hatch_in_micro_m = 200
        self.display_unit = "mm"

    def meta(self):
        return {
            "filter": self.conf_section,
            "name": "Line Hatch",
            "description": "Calculates the toolpath of the shape and fill them with a line strip hatch",
            "parameters": [
                {
                    "name": "width",
                    "label": "Size",
                    "type": "slider",
                    "min": 1000,
                    "max": "200000",
                    "value": self.width_in_micro_m
                },
                {
                    "name": "hatch",
                    "label": "Hatch Dist",
                    "type": "slider",
                    "min": 100,
                    "max": "20000",
                    "value": self.hatch_in_micro_m
                }
            ],
            "input": "image",
            "output": "contour",
            "icon": self.icon
        }

    def configure(self, conf_section, conf_file):
        self.conf_section = conf_section
        self.conf_file = conf_file
        self.width_in_micro_m = self.conf_file.get_int("width_in_micro_m", self.conf_section)
        self.hatch_in_micro_m = self.conf_file.get_int("hatch_in_micro_m", self.conf_section)
        self.display_unit = self.conf_file.get("display_unit", self.conf_section)
        # only "cm" and "mm" are allowed
        self.display_unit = "cm" if self.display_unit == "cm" else "mm"

    def process(self, image, cnt):
        try:
            # generate an inverted, single channel image. Normally OpenCV detect on "white"....but we
            # want use "black" as contour foundation
            #
            single_channel = 255 - cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

            # determine the contour
            # https://docs.opencv.org/3.4.0/d9/d8b/tutorial_py_contours_hierarchy.html
            # We need the "two level" of hierarchy for the contour to perform clipping.
            # The hierarchy is stored in that pattern: [Next, Previous, First_Child, Parent]
            #
            cnt, hierarchy = cv2.findContours(single_channel, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
            hierarchy = hierarchy[0]
            print(hierarchy)
            validated_cnt = normalize_contour(cnt)

            # scale the contour to the user defined width if we have any
            #
            if len(validated_cnt) > 0:
                # Determine the bounding rectangle
                x, y, w, h = cv2.boundingRect(np.concatenate(validated_cnt))

                # Ensure that width of the contour is the same as the width_in_mm.
                # Scale the contour to the required width.
                scale_factor = self.width_in_micro_m / w
                scaled_cnt = [np.multiply(c.astype(np.float), [scale_factor, scale_factor]).astype(np.int32) for c in validated_cnt]

                # generate a hatch pattern we want to apply
                pattern = self.build_hatch_pattern(scaled_cnt)

                hatch_cnt = []
                for parent_i in range(len(hierarchy)):
                    # [Next, Previous, First_Child, Parent]
                    # Process the parents only. It is a Parent if  "Parent" is "-1".
                    parent_h = hierarchy[parent_i]
                    if parent_h[3] == -1:
                        clip_cnt = [scaled_cnt[parent_i].tolist()]
                        # append all child contours of the parent
                        for child_i in range(len(hierarchy)):
                            child_h = hierarchy[child_i]
                            if child_h[3] == parent_i:
                                clip_cnt.append(scaled_cnt[child_i].tolist())
                        # clip the hatch with the calculated "clipping region"
                        #
                        try:
                            pc = pyclipper.Pyclipper()
                            pc.AddPaths(clip_cnt, pyclipper.PT_CLIP, True)
                            pc.AddPaths(pattern, pyclipper.PT_SUBJECT, False)
                            solution = pc.Execute2(pyclipper.CT_INTERSECTION, pyclipper.PFT_EVENODD, pyclipper.PFT_EVENODD)
                            # add the clipped hatch to the overall contour result
                            hatch = pyclipper.PolyTreeToPaths(solution)
                            for c in hatch:
                                hatch_cnt.append(np.array(c))
                        except:
                            pass
                # h_cnt = scaled_cnt.copy()
                scaled_cnt = hatch_cnt + scaled_cnt

                # generate a preview image
                preview_image = np.zeros(image.shape, dtype="uint8")
                preview_image.fill(255)

                # draw some debug information
                #i = 0
                #h_cnt = contour_into_image(h_cnt, preview_image)
                #for c in h_cnt:
                #    cv2.putText(preview_image, str(i), (c[0][0], c[0][1]), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)
                #    i = i + 1

                # place the contour into the center of the image
                preview_cnt = contour_into_image(scaled_cnt, preview_image)
                x, y, w, h = cv2.boundingRect(np.concatenate(preview_cnt))

                # draw the outline contour in yellow
                cv2.drawContours(preview_image, preview_cnt, -1, (60, 169, 242), 1)


                display_factor = 0.001 if self.display_unit == "mm" else 0.0001

                # draw the width dimension
                cv2.line(preview_image, (x, y + int(h / 2)), (x + w, y + int(h / 2)), (255, 0, 0), 1)
                cv2.circle(preview_image, (x, y + int(h / 2)), 5, (255, 0, 0), -1)
                cv2.circle(preview_image, (x + w, y + int(h / 2)), 5, (255, 0, 0), -1)
                cv2.putText(preview_image, "{:.1f} {}".format(self.width_in_micro_m * display_factor, self.display_unit),
                            (x + 20, y + int(h / 2) - 30), cv2.FONT_HERSHEY_SIMPLEX, 1.65, (255, 0, 0), 4)

                # draw the height dimension
                height_in_micro_m = self.width_in_micro_m / w * h
                cv2.line(preview_image, (x + int(w / 2), y), (x + int(w / 2), y + h), (255, 0, 0), 1)
                cv2.circle(preview_image, (x + int(w / 2), y), 5, (255, 0, 0), -1)
                cv2.circle(preview_image, (x + int(w / 2), y + h), 5, (255, 0, 0), -1)
                cv2.putText(preview_image, "{:.1f} {}".format(height_in_micro_m * display_factor, self.display_unit),
                            (x + int(w / 2) + 20, y + 50), cv2.FONT_HERSHEY_SIMPLEX, 1.65, (255, 0, 0), 4)

                image = preview_image
                validated_cnt = scaled_cnt
        except Exception as exc:
            exc_type, exc_obj, exc_tb = sys.exc_info()
            fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
            print(exc_type, fname, exc_tb.tb_lineno)
            print(type(self), exc)

        return image, validated_cnt

    def set_parameter(self, name, val):
        if name == "width":
            self.width_in_micro_m = int(val)
            self.conf_file.set("width_in_micro_m", self.conf_section, str(self.width_in_micro_m))
        if name == "hatch":
            self.hatch_in_micro_m = int(val)
            self.conf_file.set("hatch_in_micro_m", self.conf_section, str(self.hatch_in_micro_m))


    def build_hatch_pattern(self, cnt):
        x, y, w, h = cv2.boundingRect(np.concatenate(cnt))
        hatch = []
        for y_offset in np.arange(0, h+y, self.hatch_in_micro_m):
            hatch.append(np.array([[x, y_offset], [x + w, y_offset]]).astype(np.int32))
        return hatch

