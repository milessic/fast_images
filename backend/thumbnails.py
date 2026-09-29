import io
import os
from PIL import Image, ImageOps
from pathlib import Path
from config import THUMB_SIZES, SAVE_THUMBNAILS, THUMB_DIR, MEDIA_DIR

THUMB_DIR.mkdir(parents=True, exist_ok=True)


def thumb_path_for(img_path: Path, size_key: str) -> Path:
    # keep the original suffix in the name so a.png and a.jpg don't collide
    rel = img_path.relative_to(MEDIA_DIR)
    thumb_path = (THUMB_DIR / size_key / rel).with_name(rel.name + ".jpg").resolve()
    if not thumb_path.is_relative_to(THUMB_DIR):
        raise ValueError(f"thumbnail path escapes THUMBS_DIR: {thumb_path}")
    return thumb_path


def make_thumbnail(img_path: Path, size_key: str) -> Image.Image:
    with Image.open(img_path) as im:
        # apply EXIF rotation, otherwise portrait photos come out sideways
        im = ImageOps.exif_transpose(im)
        im.thumbnail(THUMB_SIZES[size_key])
        # JPEG can't store alpha / palette / 16-bit modes
        if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
            im = im.convert("RGBA")
            bg = Image.new("RGB", im.size, (0, 0, 0))
            bg.paste(im, mask=im.getchannel("A"))
            im = bg
        elif im.mode not in ("RGB", "L"):
            im = im.convert("RGB")
        return im


def get_thumbnail(img_path: Path, size_key: str) -> Path | bytes:
    """Returns a path to the cached thumbnail, or raw JPEG bytes if caching is disabled."""
    thumb_path = thumb_path_for(img_path, size_key)

    if thumb_path.exists():
        return thumb_path

    im = make_thumbnail(img_path, size_key)

    if not SAVE_THUMBNAILS:
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=85)
        return buf.getvalue()

    thumb_path.parent.mkdir(parents=True, exist_ok=True)
    # write to a temp file first so a concurrent request never serves a half-written thumbnail
    tmp_path = thumb_path.with_name(f".{thumb_path.name}.{os.getpid()}.tmp")
    im.save(tmp_path, "JPEG", quality=85)
    os.replace(tmp_path, thumb_path)
    return thumb_path
