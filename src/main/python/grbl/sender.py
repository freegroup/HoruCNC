import serial
import time

from threading import Thread


class GrblWriter:

    def __init__(self, port, baud):
        self.thread = None
        self.gcode = None
        self.serial_port = None
        try:
            self.serial_port = serial.Serial(port,baud)
            self.serial_port.flushInput()            # Flush startup text in serial input
            self.serial_port.write(str.encode('\n'))
            time.sleep(5)                            # Wait for grbl to initialize
            self.serial_port.flushInput()            # Flush startup text in serial input
        except:
            print("No serial port found")


    def is_sending(self):
        return self.thread is not None


    def send_line(self, line):
        if self.is_sending():
            print(line)
            print("milling already running...ignored")
            return
        self.__send_line(line)

    def send(self, gcode):
        self.gcode = gcode
        print("starting GRBL thread")
        self.thread = Thread(name="GRBL Sender", target=self.__send)
        self.thread.setDaemon(True)
        self.thread.start()


    def __send(self):
        # Open g-code file
        print("Streaming gcode to CNC machine. ")
        for line in self.gcode.code:
            l = line.strip() # Strip all EOL characters for streaming
            self.__send_line(l) # Send g-code block to grbl
        print("Finished background file write to CNC Machine")
        self.thread = None


    def __send_line(self, lineToSend):
        if not self.serial_port:
            print("Simulate: ", lineToSend)
            time.sleep(0.1)
            return

        ready_string = "\r\n"
        read_string = ""
        read_a_char = True
        print("CNC: ",lineToSend)
        self.serial_port.write(str.encode(lineToSend + '\n'))
        while read_a_char :
            read_string = read_string + self.serial_port.read().decode()
            ready_string_length = len(ready_string)
            if read_string[-ready_string_length:] == ready_string:
                #print("ready")
                #print(ready_string)
                read_a_char = False
            if read_string[-1] == '\n':
                #do reporting & flushing here
                #print(read_string[:-1])
                read_string = ""
