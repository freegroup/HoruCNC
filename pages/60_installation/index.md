---
layout: default
title: Installation
nav_order: 60
has_toc: false
---

## Get the software running
The software is written in Python3 for convenience. Python has a very good interface to OpenCV for image processing, which is heavily used here.

```sh 
git clone https://github.com/freegroup/HoruCNC.git HoruCNC
cd HoruCNC

pip3 install opencv-python
sudo apt install python3-opencv
sudo apt install libqt4-test
pip3 install -r requirements.txt

python3 ./src/main.py
```


