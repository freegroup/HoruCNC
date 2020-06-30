import serial
import time

# Open grbl serial port
serial_port = None

try:
    serial_port = serial.Serial('/dev/ttyAMA0',115200)
except:
    print("No serial port found")

readyToSend = False
readyString = "ok\r\n"

def outputLineAndWaitForReady(lineToSend):
    if not serial_port:
        print("no serial port configured")
        return

    readString = ""
    readAChar = True
    serial_port.write(str.encode(lineToSend + '\n'))
    while (readAChar) :
        readString = readString + s.read().decode()
        readyStringLength = len(readyString)

        #print("read string:" + readString)
        #print("last part of read string: " + readString[-readyStringLength:])
        if (readString[-readyStringLength:] == readyString):
            #print("ready")
            print(readyString)
            readAChar = False
        if (readString[-1] == '\n'):
            #do reporting & flushing here
            print(readString[:-1])
            readString = ""

if serial_port:
    serial_port.flushInput()  # Flush startup text in serial input
    serial_port.write(str.encode('\n'))
    time.sleep(5)             # Wait for grbl to initialize
    serial_port.flushInput()  # Flush startup text in serial input
