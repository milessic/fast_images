from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from config import MEDIA_DIR, IMAGE_RESOLUTION, FE_DIR, THUMB_SIZES, IMAGE_EXTS, VIDEO_EXTS
from thumbnails import get_thumbnail

app = FastAPI()

app.mount("/static", StaticFiles(directory=FE_DIR), name="static")


def is_hidden(path):
    return path.name.startswith(".")

def media_path(path: str) -> Path:
    """Resolve a client supplied path, refusing anything outside MEDIA_DIR."""
    p = (MEDIA_DIR / path.lstrip("/")).resolve()
    if not p.is_relative_to(MEDIA_DIR): raise HTTPException(403)
    if not p.exists(): raise HTTPException(404)
    return p

def list_dir(path: Path):
    folders, images, videos = [], [], []
    for p in sorted(path.iterdir(), key=lambda p: p.name.lower()):
        if is_hidden(p): continue
        if p.is_dir(): folders.append(p.name)
        elif p.suffix.lower() in IMAGE_EXTS:
            images.append(p.name)
        elif p.suffix.lower() in VIDEO_EXTS:
            videos.append(p.name)
    return folders, images, videos


@app.get("/api/browse")
def browse(path: str = ""):
    base = media_path(path)
    if not base.is_dir(): raise HTTPException(404)
    folders, images, videos = list_dir(base)
    return {"path": path, "folders": folders, "images": images, "videos": videos}


@app.get("/api/image")
def image(path: str, res: str = IMAGE_RESOLUTION):
    img = media_path(path)
    if img.suffix.lower() not in IMAGE_EXTS: raise HTTPException(400, "not an image")
    if res != "original" and res not in THUMB_SIZES: raise HTTPException(400, f"unknown resolution '{res}'")

    if res == "original":
        return FileResponse(img)

    thumb = get_thumbnail(img, res)
    if isinstance(thumb, bytes):
        return Response(thumb, media_type="image/jpeg")
    return FileResponse(thumb, media_type="image/jpeg")


@app.get("/api/video")
def video(path: str):
    vid = media_path(path)
    if vid.suffix.lower() not in VIDEO_EXTS: raise HTTPException(400, "not a video")
    return FileResponse(vid)


@app.get("/")
def home():
    return FileResponse(FE_DIR / "index.html")
