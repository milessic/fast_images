// null -> let the server use IMAGE_RESOLUTION from .env
let resolution = null;
let currentPath = "";
let slideshow = null;
// media of the current folder: [{path, video}]
let media = [];
// open overlay state: {list, index, container, current, preloaded, playing}
let viewer = null;

const SETTINGS_KEY = "fast_images.settings";

function loadSettings(){
	try {
		return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
	} catch (e) {
		return {};
	}
}

function saveSettings(patch){
	try {
		localStorage.setItem(SETTINGS_KEY, JSON.stringify({...loadSettings(), ...patch}));
	} catch (e) {
		console.error("Couldn't save settings", e);
	}
}

function mediaUrl(item, res = resolution){
	const path = encodeURIComponent(item.path);
	if (item.video) return `/api/video?path=${path}`;
	return res ? `/api/image?path=${path}&res=${res}` : `/api/image?path=${path}`;
}

function joinPath(base, name){
	return base ? `${base}/${name}` : name;
}

function toMedia(data){
	return [
		...data.images.map(i => ({path: joinPath(data.path, i), video: false})),
		...(data.videos || []).map(v => ({path: joinPath(data.path, v), video: true})),
	].sort((a, b) => a.path.localeCompare(b.path, undefined, {sensitivity: "base"}));
}

// track focus
let items = [];
let currentIndex = 0;


function scrollIntoViewIfNeeded(el) {
  if (!el) return;

  const rect = el.getBoundingClientRect();

  const isVisible =
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth);

  if (isVisible) return;

  if (rect.top < 0) {
    window.scrollBy(0, rect.top);
  } else if (rect.bottom > window.innerHeight) {
    window.scrollBy(0, rect.bottom - window.innerHeight);
  }

  if (rect.left < 0) {
    window.scrollBy(rect.left, 0);
  } else if (rect.right > window.innerWidth) {
    window.scrollBy(rect.right - window.innerWidth, 0);
  }
}


function setFitem(el){
	el.onmouseover = () => setFocus(el);
}
function updateItems() {
	items = Array.from(document.querySelectorAll(".fitem"));
	if (items.length) {
		items[currentIndex].focus();
	}
	console.log('update items');
}

function resetFocus(){
	document.querySelectorAll('.fitem-focus').forEach(e => e.classList.remove('fitem-focus'));
}

function moveFocus(direction) {
	resetFocus();
	const cols = Math.floor(grid.clientWidth / grid.querySelector(".fitem").clientWidth) - 1 || 1;
	if (direction === "ArrowRight") {
		currentIndex = Math.min(items.length - 1, currentIndex + 1);
	} else if (direction === "ArrowLeft") {
		currentIndex = Math.max(0, currentIndex - 1);
	} else if (direction === "ArrowDown") {
		currentIndex = Math.min(items.length - 1, currentIndex + cols);
	} else if (direction === "ArrowUp") {
		currentIndex = Math.max(0, currentIndex - cols);
	}
	setFocus(items[currentIndex]);
}

function setFocus(element){
	resetFocus();
	element.classList.add('fitem-focus');
	scrollIntoViewIfNeeded(element);
}

// slide show speed
function updateSlideShowSpeed(){
	let raw_input = parseInt(slideshowspeed.value);
	if (isNaN(raw_input) || raw_input < 1){
		console.error(`This is not an integeer! - '${raw_input}'`)
		return
	}
	slideshow_speed = raw_input * 1000;
	saveSettings({slideshowSpeed: raw_input});
}

let slideshow_speed = 0
if (loadSettings().slideshowSpeed) slideshowspeed.value = loadSettings().slideshowSpeed;
updateSlideShowSpeed();




function updatePathHeader(path){
	document.querySelectorAll("h3 button").forEach(e => e.remove());
	const as_list = path.split("/");
	// get rid of empty first item
	if (as_list[0] === ""){as_list.shift()}
	
	// root
	const root_el = document.createElement('button');
	root_el.className = "btn small ghost";
	root_el.innerText = "Pictures";
	root_el.onclick = () => browse("");
	pathheader.appendChild(root_el);

	// itarate over elements
	for (let i = 0; i < as_list.length; i++){
		const e = as_list[i];
		const sp_el = document.createElement('button');
		sp_el.className = "btn small ghost";
		const this_path = as_list.slice(0,i+1).join("/"); 
		sp_el.innerText = e ;

		sp_el.onclick = () => browse(this_path);
		pathheader.appendChild(sp_el);
	}

}

async function fetchDir(path) {
	const res = await fetch(`/api/browse?path=${encodeURIComponent(path)}`);
	if (!res.ok) throw new Error(`Couldn't open '${path}' (${res.status})`);
	return res.json();
}

async function collectMedia(path) {
	const data = await fetchDir(path);
	let list = toMedia(data);

	for (const folder of data.folders) {
		list = list.concat(await collectMedia(joinPath(data.path, folder)));
	}

	return list;
}



async function browse(path = "") {
	updatePathHeader(path);
	const data = await fetchDir(path);
	currentPath = path;
	currentIndex = 0;
	render(data);
}

function render(data) {
	const grid = document.getElementById("grid");
	grid.innerHTML = "";

	data.folders.forEach(f => {
		const el = document.createElement("div");
		el.className = "item";
		el.classList.add('fitem');
		el.innerHTML = `📁<div></div>`;
		el.querySelector("div").textContent = f;
		el.onclick = () => browse(joinPath(data.path, f));
		grid.appendChild(el);
	});

	media = toMedia(data);

	media.forEach((m, index) => {
		const el = document.createElement("div");
		el.className = "item";
		el.classList.add("fitem");
		if (m.video) {
			el.innerHTML = `<div class="video-thumb">🎬</div><div></div>`;
		} else {
			el.innerHTML = `<img loading="lazy"/><div></div>`;
			el.querySelector("img").src = mediaUrl(m, "low");
		}
		el.lastElementChild.textContent = m.path.split('/').pop();
		el.onclick = () => openViewer(media, index);
		grid.appendChild(el);
	});
	document.querySelectorAll('.fitem').forEach((el) => {setFitem(el)})
	updateItems();
}

// --- viewer (single picture / video, used by the slideshow too) ---

function createMediaElement(item){
	let el;
	if (item.video) {
		el = document.createElement("video");
		el.controls = true;
		el.playsInline = true;
		el.preload = "auto";
	} else {
		el = document.createElement("img");
		el.decoding = "async";
	}
	el.classList.add("viewer-media");
	el.dataset.path = item.path;
	el.src = mediaUrl(item);
	return el;
}

// drop the element and its data so the browser can free the decoded picture / video buffers
function releaseMedia(el){
	if (!el) return;
	el.onload = el.onerror = el.onended = null;
	if (el.tagName === "VIDEO") el.pause();
	el.removeAttribute("src");
	if (el.tagName === "VIDEO") el.load();
	el.remove();
}

function openViewer(list, index = 0, playing = false){
	closeViewer();
	const container = document.createElement("div");
	container.className = "img-container viewer-overlay";
	container.innerHTML = `
		<button class="btn viewer-btn viewer-prev" title="Previous">‹</button>
		<button class="btn viewer-btn viewer-next" title="Next">›</button>
		<div class="viewer-top">
			<button class="btn viewer-btn viewer-play" title="Play / pause slideshow"></button>
			<button class="btn viewer-btn viewer-close" title="Close">✕</button>
		</div>`;
	const onButton = (selector, fn) => {
		container.querySelector(selector).onclick = (e) => { e.stopPropagation(); fn(); };
	};
	onButton(".viewer-prev", () => step(-1));
	onButton(".viewer-next", () => step(1));
	onButton(".viewer-play", togglePlay);
	onButton(".viewer-close", closeViewer);
	container.onclick = closeViewer;

	let touchX = null;
	container.addEventListener("touchstart", (e) => { touchX = e.changedTouches[0].clientX; }, {passive: true});
	container.addEventListener("touchend", (e) => {
		if (touchX === null) return;
		const dx = e.changedTouches[0].clientX - touchX;
		touchX = null;
		if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
	});

	document.body.appendChild(container);
	viewer = {list, index, container, current: null, preloaded: null, playing};
	showCurrent();
}

function closeViewer(){
	clearTimeout(slideshow);
	if (!viewer) return;
	releaseMedia(viewer.current);
	releaseMedia(viewer.preloaded);
	viewer.container.remove();
	viewer = null;
}

function showCurrent(){
	clearTimeout(slideshow);
	const item = viewer.list[viewer.index];

	let el;
	if (viewer.preloaded && viewer.preloaded.dataset.path === item.path) {
		el = viewer.preloaded;
	} else {
		releaseMedia(viewer.preloaded);
		el = createMediaElement(item);
	}
	viewer.preloaded = null;
	releaseMedia(viewer.current);
	viewer.current = el;
	viewer.container.appendChild(el);
	updatePlayButton();

	const isCurrent = () => viewer && viewer.current === el;

	if (item.video) {
		// clicking the video controls shouldn't close the viewer
		el.onclick = (e) => e.stopPropagation();
		el.onended = () => { if (isCurrent() && viewer.playing) step(1); };
		el.onerror = () => { if (isCurrent()) scheduleNext(); };
		el.play().catch(() => {
			// autoplay with sound can be blocked, retry muted
			el.muted = true;
			el.play().catch(() => {});
		});
		preloadNext();
	} else {
		const loaded = () => {
			if (!isCurrent()) return;
			preloadNext();
			scheduleNext();
		};
		if (el.complete) loaded();
		else el.onload = el.onerror = loaded;
	}
}

// start downloading the next picture once the current one is loaded
function preloadNext(){
	if (!viewer || viewer.list.length < 2) return;
	const next = viewer.list[(viewer.index + 1) % viewer.list.length];
	if (next.video) return;
	viewer.preloaded = createMediaElement(next);
}

function scheduleNext(){
	clearTimeout(slideshow);
	if (!viewer || !viewer.playing) return;
	const item = viewer.list[viewer.index];
	// videos advance on 'ended'; broken videos fall through to the timer
	if (item.video && !viewer.current.error) return;
	slideshow = setTimeout(() => step(1), slideshow_speed);
}

function step(delta){
	if (!viewer) return;
	const len = viewer.list.length;
	viewer.index = (viewer.index + delta + len) % len;
	showCurrent();
}

function togglePlay(){
	if (!viewer) return;
	viewer.playing = !viewer.playing;
	updatePlayButton();
	if (!viewer.playing) {
		clearTimeout(slideshow);
	} else if (viewer.current.tagName === "VIDEO" && viewer.current.ended) {
		step(1);
	} else {
		scheduleNext();
	}
}

function updatePlayButton(){
	viewer.container.querySelector(".viewer-play").textContent = viewer.playing ? "⏸" : "▶";
}

async function startSlideshow(shuffle=false) {
	const list = await collectMedia(currentPath);
	if (!list.length){
		const msg = "Didn't detect any pictures or videos!"
		window.alert(msg);
		console.error(msg);
		return
	}
	if (shuffle) {
		for (let i = list.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[list[i], list[j]] = [list[j], list[i]];
		}
	}
	openViewer(list, 0, true);
}

// style picker (milessic-themes), the choice is kept in a cookie so the server renders it on the next load
if (window.MilessicThemes) {
	MilessicThemes.mountPicker(document.getElementById("theme-picker"), {
		label: "Style",
		onChange: (key) => { document.cookie = `theme=${encodeURIComponent(key)}; path=/; max-age=31536000; SameSite=Lax`; },
	}).then(() => { document.getElementById("theme-settings").hidden = false; })
	  .catch((e) => console.error("Couldn't load styles", e));
}

document.querySelectorAll("#play").forEach(e => e.onclick = () => startSlideshow(false));
document.querySelectorAll("#shuffle").forEach(e => e.onclick = () => startSlideshow(true));
document.querySelectorAll("#slideshowspeed").forEach(e => e.oninput = () => updateSlideShowSpeed());

document.addEventListener("keydown", (e) => {
	if (viewer) {
		if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
		e.preventDefault();
		if (e.key === "ArrowRight" || e.key === "ArrowDown") {
			step(1);
		} else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
			step(-1);
		} else if (e.key === " ") {
			const v = viewer.current;
			if (v.tagName === "VIDEO") v.paused ? v.play() : v.pause();
			else togglePlay();
		} else {
			closeViewer();
		}
		return;
	}
	if (e.target.tagName === "INPUT") return;

	updateItems();
	if (!items.length) return;
	if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
		e.preventDefault();
		moveFocus(e.key);
	} else if (e.key === "Enter") {
		e.preventDefault();
		items[currentIndex].click();
	}
});

browse();

