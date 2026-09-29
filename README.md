# fast_images
Media web server for serving pictures and videos.

It's in beta, please look at the roadmap for 1.0:

### 1.0 roadmap
- [x] fetch pictures
- [ ] fetch videos
- [x] navigate using arrows/mouse/touch
- [ ] add visible arrows in slideshow (to work as arrow-left, arrow-right)
- [ ] save client settings like save interval
- [ ] laod images[index +1] picture when images[index] is already loaded
- [ ] add restriction to fefch data only from ```MEDIA_DIR``` and thumbs only from ```THUMBS_DIR``` (security) 
- [ ] delete image from memory if it was already loaded
- [ ] host demo :)

- [ ] fix aspect ratio issue on ```IMAGE_RESOLUTION != original```
- [ ] fix some of the pictures are not loading on ```IMAGE_RESOLUTION != original```


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

3. run FastApi server, you can run ```backend/run_server.sh``` to run uvicorn on port 8123

