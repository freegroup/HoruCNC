import serial
import time

# Open grbl serial port
s = serial.Serial('/dev/tty.usbserial-AM004QFS',115200)

# Open g-code file
f = open('test.nc','r')
s.flushInput()  # Flush startup text in serial input
readyToSend = False
readyString = "ok\r\n"

def outputLineAndWaitForReady(lineToSend):
    readString = ""
    readAChar = True
    s.write(str.encode(lineToSend + '\n'))
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

s.write(str.encode('\n'))
time.sleep(5)   # Wait for grbl to initialize
s.flushInput()  # Flush startup text in serial input
# Stream g-code to grbl
for line in f:
    l = line.strip() # Strip all EOL characters for streaming
    print ('Sending: ' + l)
    outputLineAndWaitForReady(l) # Send g-code block to grbl

# Close file and serial port
f.close()
s.close()