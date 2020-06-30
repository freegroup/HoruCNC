import serial
import time
import threading

# Open grbl serial port
serial_port = None

try:
    serial_port = serial.Serial('/dev/ttyAMA0',115200)
except:
    print("No serial port found")

readyToSend = False
ready_string = "ok\r\n"

def outputLineAndWaitForReady(lineToSend):
    if not serial_port:
        print(lineToSend)
        return
    
    read_string = ""
    read_a_char = True
    serial_port.write(str.encode(lineToSend + '\n'))
    while read_a_char :
        read_string = read_string + s.read().decode()
        ready_string_length = len(ready_string)
        if read_string[-ready_string_length:] == ready_string:
            #print("ready")
            print(ready_string)
            read_a_char = False
        if read_string[-1] == '\n':
            #do reporting & flushing here
            print(read_string[:-1])
            read_string = ""

if serial_port:
    serial_port.flushInput()  # Flush startup text in serial input
    serial_port.write(str.encode('\n'))
    time.sleep(5)             # Wait for grbl to initialize
    serial_port.flushInput()  # Flush startup text in serial input

# Inherting the base class 'Thread'
class AsyncWrite(threading.Thread):

    def __init__(self, filename):
        # calling superclass init
        threading.Thread.__init__(self)
        self.filename = filename

    def run(self):
        # Open g-code file
        print("streaming gcode to CNC machine. ", self.filename)
        with open(self.filename,'r') as f:
            # Stream g-code to grbl
            for line in f:
                l = line.strip() # Strip all EOL characters for streaming
                outputLineAndWaitForReady(l) # Send g-code block to grbl
        print("Finished background file write to CNC Maschine")
