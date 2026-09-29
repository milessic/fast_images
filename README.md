# fast_images
Media web server for serving pictures and videos.

It's in beta, please look at the roadmap for 1.0:

### 1.0 roadmap
- [x] fetch pictures
- [x] fetch videos
- [x] navigate using arrows/mouse/touch
- [x] add visible arrows in slideshow (to work as arrow-left, arrow-right)
- [x] save client settings like save interval
- [x] laod images[index +1] picture when images[index] is already loaded
- [x] add restriction to fefch data only from ```MEDIA_DIR``` and thumbs only from ```THUMBS_DIR``` (security) 
- [x] delete image from memory if it was already loaded
- [ ] host demo :)

- [x] fix aspect ratio issue on ```IMAGE_RESOLUTION != original```
- [x] fix some of the pictures are not loading on ```IMAGE_RESOLUTION != original```


## Envrionment setup

1. Install requirements ```python3 -m pip install -r backend/requirements.txt```
2. Create ```backend/.env``` file:
```.env
MEDIA_DIR=/media/photos
THUMBS_DIR=/media/thumbs
SAVE_THUMBNAILS=True
IMAGE_RESOLUTION=original
```
IMAGE_RESOLUTION can be 'original', 'high', 'medium', 'low'

Supported pictures: jpg, jpeg, png, webp. Supported videos: mp4, webm, mov, m4v, mkv, ogv (playback depends on the browser's codecs).

3. run FastApi server, you can run ```backend/run_server.sh``` to run uvicorn on port 8123

