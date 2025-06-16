import sys
import os

# Add your project directory to the sys.path
INTERP = os.path.expanduser("/home/YOUR_CPANEL_USERNAME/virtualenv/Plastic-waste-web/3.9/bin/python")
if sys.executable != INTERP:
    os.execl(INTERP, INTERP, *sys.argv)

sys.path.append(os.getcwd())

# Import your Flask app
from app import app as application 