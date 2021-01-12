---
layout: default
title: Architecture
nav_order: 30
has_toc: false
---

# Basic Principal of the Software

The basic idea of the software is to use a **filter pipeline** to process the input image and generate [GCode](https://en.wikipedia.org/wiki/G-code) output. The *pipeline* uses filters to transform the data in filter stages.

## Pipelines
Filters are arranged and processed in a specific order, called a pipeline. 
Each filter takes a single action. For example, the Blur Filter takes an incoming video frame, applies a blur action to the image and then passes the new image to the next filter in the process.


![image_to_gcode](images/pipeline.png)


The order of the filters matches the order on the left-hand side of the UI. Each filters effects is immediately visible in the preview video feed and can have some slider to adjust basic filter parameter.


![image_to_gcode](./images/screenshot.png)


## Output
After processing and converting the input image into vector data, the data is taken and converted to GCODE.  

CNC machines like routers or milling machines make use of a series of pre-programmed commands to, in subtractive processes, take material from your piece. The most popular programming language is G-Code, the creation of which marked an important step in the history of CAM. This language controls exactly how your CNC machine’s tools move. From how fast your tools move to the speed of rotation, everything is covered in the G-Code. 

The generated GCode of this software can either send direct to your CNC machine which runs grbl or you can use bCNC as an host to connect to your machine.