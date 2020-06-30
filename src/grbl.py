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


# Inherting the base class 'Thread'
class AsyncWrite(threading.Thread):

    def __init__(self, text):

        # calling superclass init
        threading.Thread.__init__(self)
        self.text = text
        self.out = out

    def run(self):

        f = open(self.out, "a")
        f.write(self.text + '\n')
        f.close()

        # waiting for 2 seconds after writing
        # the file
        time.sleep(2)
        print("Finished background file write to",
              self.out)
