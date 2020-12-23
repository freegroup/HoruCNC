---
layout: default
title: Pipelines
nav_order: 40
has_toc: false
---

# Pipelines
A pipeline is nothing more than a `ini-file` which contains different filter entries. All pipelines are stored in the `./pipelines` directory of the cloned repository and shown in the start screen of the application.

In the screenshot below we have 3 different pipelines with a different purpose.
 - **Mill Outline of Image**   
   Carve out the outline shape of a scanned image
 - **Carves Height Map of an Image**   
   Converts the image to a height map. Its toolpathing strategy uses many parallel lines of varying depth to convey brightness information of the input image.
 - **Carve Image Outline**   
   Engrave the scanned outline of an image. Very suitable if you want to engrave tags or nameplates
   
![screenshot](images/screenshot.png)

## Pipeline Definition
The software is not designed to cover just these three simple use cases. You can easily create your own pipeline and preconfigure it for your specific use case.

Below is a simple pipeline documenting how this is done. Which possible filters can be used, can be seen under **Filters**.

```ini 
###########################################################################################
# The "common" section contains some meta information about the pipeline.
# This section is required.
###########################################################################################
#
[common]
author = Andreas Herz
name = Carve Height Map from Image
description = Carves the height map of an grayscale image

###########################################################################################
# The Source of the image pipeline. Defines zooming and the width of the processing image
###########################################################################################
[source]
zoom = 1
width = 640


###########################################################################################
# FILTER SECTION
###########################################################################################

###########################################################################################
# Converts graylevel to black&white. The user can define the threshold in the UI
###########################################################################################
[processing.image.grayscale.Filter]
menu = true
# The threshold defines all values below that "gray level" are not part of the outline to carve
#
threshold = 0


###########################################################################################
# Truncates the histogram of the image and remove the white and black parts.
###########################################################################################
[processing.image.truncate.Filter]
menu = true


###########################################################################################
# Generates the terrain contour of the image. Black colors goes deeper and white colors
# goes higher with the milling cutter. This generates a reliefe of the gray scale image.
###########################################################################################
[processing.image.to_terrain.Filter]
menu = true
depth_in_micro_m = 1685.0
depth_range_min = 10
depth_range_max = 10000


###########################################################################################
# Moves the origin of the contour into the centerpoint. Now the [0,0] is in the center point
# of the contour
###########################################################################################
[processing.contours.origin.Filter]
menu = false


###########################################################################################
# Scales the contour to the user given dimension
###########################################################################################
[processing.contours.scale.Filter]
menu = true
width_in_micro_m = 40962
display_unit = cm


###########################################################################################
# Converts the 3D contour data to GCODE
###########################################################################################
[processing.contours.to_gcode.Filter]
menu = false
# feed rate of the mill in [mm]/[minutes]
# ( move without carving is two time faster )
feed_rate = 50

# clearance above the workpiece in [mm]
#
clearance = 3

```
