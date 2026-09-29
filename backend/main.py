from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from config import MEDIA_DIR, IMAGE_RESOLUTION, FE_DIR
from thumbnails import get_thumbnail

app = FastAPI()

app.mount("/static", StaticFiles(directory=FE_DIR), name="static")


def is_hidden(path):
    return path.name.startswith(".")

def list_dir(path: Path):
    folders, images = [], []
    for p in path.iterdir():
        if is_hidden(p): continue
        if p.is_dir(): folders.append(p.name)
        elif p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}:
            images.append(p.name)
    return folders, images


@app.get("/api/browse")
def browse(path: str = ""):
    base = MEDIA_DIR / path.removeprefix("/")
    if not base.exists(): raise HTTPException(404)
    folders, images = list_dir(base)
    return {"path": path, "folders": folders, "images": images}


@app.get("/api/image")
def image(path: str, res: str = IMAGE_RESOLUTION):
    img = MEDIA_DIR / path.removeprefix("/")
    if not img.exists(): raise HTTPException(404)

    if res == "original":
        return FileResponse(img)

    thumb = get_thumbnail(img, res)
    return FileResponse(thumb)

@app.get("/")
def home():
    return FileResponse(FE_DIR / "index.html")
