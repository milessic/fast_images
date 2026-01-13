import os
from pathlib import Path

class Env:
    def __init__(self):
        self._vars = {}
        with open(os.path.join(os.path.dirname(__file__), ".env"),"r") as f:
            for l in f.readlines():
                k,v = l.split(sep="=")
                self._vars[k] = v

    def get(self, var):
        value = self._vars[var].strip()
        match value:
            case "True":
                return True
            case "False":
                return False
            case "None":
                return None
            case _:
                return value


env = Env()

FE_DIR = Path(str(os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")))
MEDIA_DIR = Path(env.get("MEDIA_DIR"))
THUMB_DIR = Path("THUMBS_DIR")
SAVE_THUMBNAILS = env.get("SAVE_THUMBNAILS")
IMAGE_RESOLUTION = env.get("IMAGE_RESOLUTION") # low | medium | original

THUMB_SIZES = {
        "low": (320, 240),
        "medium": (1280, 720),
        "high": (2080, 1080)
    }
