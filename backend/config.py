import os
from pathlib import Path

class Env:
    def __init__(self):
        self._vars = {}
        with open(os.path.join(os.path.dirname(__file__), ".env"),"r") as f:
            for l in f.readlines():
                if not l.strip() or l.lstrip().startswith("#"): continue
                k,v = l.split(sep="=", maxsplit=1)
                self._vars[k.strip()] = v

    def get(self, var, default=None):
        if var not in self._vars:
            return default
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
MEDIA_DIR = Path(env.get("MEDIA_DIR")).resolve()
THUMB_DIR = Path(env.get("THUMBS_DIR", os.path.join(os.path.dirname(__file__), ".thumbs"))).resolve()
SAVE_THUMBNAILS = env.get("SAVE_THUMBNAILS", True)
IMAGE_RESOLUTION = env.get("IMAGE_RESOLUTION", "original") # low | medium | high | original

THUMB_SIZES = {
        "low": (320, 240),
        "medium": (1280, 720),
        "high": (2080, 1080)
    }

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
VIDEO_EXTS = {".mp4", ".webm", ".mov", ".m4v", ".mkv", ".ogv"}
