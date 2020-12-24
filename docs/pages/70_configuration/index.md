---
layout: default
title: Configuration
nav_order: 70
has_toc: false
---

# Configuration

The configuration of the software is stored in the `./config/configuration.ini` file. 

``` 
[common]
# which camera to use to scan the image to carve
# (index of the openCV camera)
camera-scanner=0

# settings of the CNC machine
# (GRBL compatible machine required)
#
serial-port=/dev/ttyAMA0
serial-baud=115200

# How often should the UI update the preview image
#
image-read-ms=500

# path to the pipeline folders. (relative to the "./src/main.py" file)
#
pipelines=../pipelines

```

