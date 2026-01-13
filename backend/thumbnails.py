from PIL import Image
from pathlib import Path
from config import THUMB_SIZES, SAVE_THUMBNAILS, THUMB_DIR

THUMB_DIR.mkdir(parents=True, exist_ok=True)


def get_thumbnail(img_path: Path, size_key: str) -> Path:
    thumb_path = THUMB_DIR / size_key / img_path.relative_to(img_path.anchor)
    thumb_path.parent.mkdir(parents=True, exist_ok=True)

    if thumb_path.exists():
        return thumb_path
    
    with Image.open(img_path) as im:
        im.thumbnail(THUMB_SIZES[size_key])
        if SAVE_THUMBNAILS:
            im.save(thumb_path, "JPEG")
    
    return thumb_path
