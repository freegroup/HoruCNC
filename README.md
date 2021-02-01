# HoruCNC ([horu](https://glosbe.com/ja/en/horu))
 
![teaser](./images/teaser.svg)


CNC machines are an essential part of the hacker’s toolset. These computer-controlled cutters of wood, metal and other materials can translate a design into a prototype in short order, making the process of iterating a project much easier. However, the software to create these designs can be expensive and complex.

The motivation for this project was to reduce the effort of toolpath generation and the frustration at the cost of commercial software. 

![screenshot](./images/screenshot.png)


Read more on the [Project Page](https://freegroup.github.io/HoruCNC/)



## configuration snippets

pyside2-rcc ./src/main/resources/base/ui/resources.qrc -o ./src/main/python/ui/resources.py
pip install fbs PyInstaller==3.4

pyinstaller -y --clean --windowed main.spec


iconutil -c icns ./HoruCNC.iconset

pushd dist
hdiutil create ./HoruCNC.dmg -srcfolder HoruCNC.app -ov
popd


