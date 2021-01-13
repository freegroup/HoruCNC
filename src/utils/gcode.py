class GCode:

  # Create an instance of GCode
  def __init__(self):

    self.code = []

    self.name = "0001"
    self.unit = 'mm'
    self.positioning = "absolute"

    # Define the clearance (10mm default)
    self.clearance = 10

    # Define the feed_rate (50mm / minute)
    self.feed_rate = 150
    self.rapid_rate = 300

    # Define the start position (clearance unscaled here)
    self.start = [0, 0, self.clearance]

    # Define the finish position (clearance unscaled here)
    self.finish = [0, 0, self.clearance]

    # Add code for which unit system to use (mm )
    self.add('G21')


  # Applying the positioning (absolute or relative)
  def set_absolute(self, absolute):
    # Add the positioning code
    self.add('G90' if absolute else 'G91')


  # Apply the scale based on the units
  def scale(self, number):
    # Return the number as scale is mm or inches
    return number


  # Derive the coordinate words from a position { x, y, z }
  def position_code(self, position):

    # Create a list of positions
    positions = []

    # If there is an x coordinate then add it to the positions
    if "x" in position:
        positions.append('X'+str(self.scale(position['x'])))

    # If there is an y coordinate then add it to the positions
    if "y" in position:
        positions.append('Y'+str(self.scale(position['y'])))

    # If there is an z coordinate then add it to the positions
    if "z" in position:
        positions.append('Z'+str(self.scale(position['z'])))

    # Return the position words
    return " ".join(positions)

  # Derive the feed_rate word from a feed_rate (mm/minute)
  def feed_rate_code(self, feed_rate = None):
    feed_rate = feed_rate if feed_rate else self.feed_rate
    # Return the feed_rate word
    return 'F' + str(feed_rate)


  # Drop the mill to a specified depth (0 by default)
  def drop_mill(self, depth = 0):
    # Add the code to drop the mill
    self.feed_rapid({ "z": depth }, self.feed_rate)


  # Raise the mill to a specified depth (clearance value by default)
  def raise_mill(self, depth = None):
    if depth is None:
        depth =self.clearance
        
    # Add the code to raise the mil
    self.feed_rapid({ "z": depth }, self.feed_rate)


  # Start the spindle in a direction (clockwise by default)
  def start_spindle(self, clockwise = True):
    # Add the code to the stack to start the spindle in a specified direction
    self.add('M03' if clockwise else 'M04')


  # Stop the spindle
  def stop_spindle(self ):
    # Add the code to the stack to stop the spindle
    self.add('M05')


  # Start the coolant with a certain intensity (false by default)
  def start_coolant(self, flood = False):
    # Add the code to the stack to start the coolant
    self.add('M08' if flood else 'M07')


  # Stop the coolant
  def stop_coolant(self):
    # Add the code to the stack to stop the coolant
    self.add('M09')


   # Motion in a specified way towards a point
  def motion(self, code, position, feed_rate):
    # Add the code to the stack to feed to the specified position
    self.add('G' + code + " "+ self.position_code(position) +" "+ self.feed_rate_code(feed_rate))


  # Feed rapidly to a position at a specified feed_rate
  def feed_rapid(self, position, feed_rate=None):
    feed_rate = feed_rate if feed_rate else self.rapid_rate

    # Add the code to feed rapidly to the position
    self.motion('00', position, feed_rate)


  # Feed linearly to a position at a specified feed_rate
  def feed_linear(self, position, feed_rate=None):
    # Add the code to the stack to linearly to the specified position
    self.motion('01', position, feed_rate if feed_rate else self.feed_rate)


  # Terminate our code and ensure everything is stopped
  def terminate(self, force = False):
    # Check that the code is not force stopping
    if not force:
      # Raise the mill above the clearance
      self.raise_mill()

      # Stop the spindle
      self.stop_spindle()

      # Stop the coolant
      self.stop_coolant()

    # Force stop or rewind the program
    self.add('M00' if force else 'M30')


  # Add the code to the stack
  def add(self, code):
    # Add the code specified to the code stack
    self.code.append(code)


  # Return the same output as the eval function
  def to_string(self):
    return '\n'.join(self.code)

