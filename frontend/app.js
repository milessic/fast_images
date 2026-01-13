let resolution = 'original';
let currentPath = "";
let slideshow = null;
let images = [];

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
	if (isNaN(raw_input)){
		console.error(`This is not an integeer! - '${raw_input}'`)
		return
	}
	console.log('ok');
	slideshow_speed = parseInt(slideshowspeed.value) * 1000;
}

let slideshow_speed = 0
updateSlideShowSpeed();




function updatePathHeader(path){
	document.querySelectorAll("h3 button").forEach(e => e.remove());
	const as_list = path.split("/");
	// get rid of empty first item
	if (as_list[0] === ""){as_list.shift()}
	
	// root
	const root_el = document.createElement('button');
	root_el.innerText = "Home";
	root_el.onclick = () => browse("");
	pathheader.appendChild(root_el);

	// itarate over elements
	for (let i = 0; i < as_list.length; i++){
		const e = as_list[i];
		const sp_el = document.createElement('button');
		const this_path = as_list.slice(0,i+1).join("/"); 
		sp_el.innerText = e ;

		sp_el.onclick = () => browse(this_path);
		pathheader.appendChild(sp_el);
	}

}

async function collectImages(path) {
  const res = await fetch(`/api/browse?path=${path}`);
  const data = await res.json();

  let imgs = data.images.map(i => `${data.path}/${i}`);

  for (const folder of data.folders) {
    const subPath = data.path ? `${data.path}/${folder}` : folder;
    const subImgs = await collectImages(subPath);
    imgs = imgs.concat(subImgs);
  }

  return imgs;
}



async function browse(path = "") {
	updatePathHeader(path);
	const res = await fetch(`/api/browse?path=${path}`);
	const data = await res.json();
	currentPath = path;
	render(data);
}

function render(data) {
	updateItems();
	const grid = document.getElementById("grid");
	grid.innerHTML = "";
	
	data.folders.forEach(f => {
		const el = document.createElement("div");
		el.className = "item";
		el.classList.add('fitem');
		el.innerHTML = `📁<div>${f}</div>`;
		el.onclick = () => browse(`${data.path}/${f}`);
		grid.appendChild(el);
	});

	images = data.images.map(i => `${data.path}/${i}`);
	
	images.forEach(i => {
		const el = document.createElement("div");
		el.className = "item";
		el.classList.add("fitem");
		el.innerHTML = `<img src="/api/image?path=${i}&res=low"/><div>${i.split('/').pop()}</div>`;
		el.onclick = () => openImage(i);
		grid.appendChild(el);
	});
	document.querySelectorAll('.fitem').forEach((el) => {setFitem(el)})
}

function openImage(path) {
	document.querySelectorAll('.img-container').forEach(e => e.remove());
	const container = document.createElement("div");
	container.classList.add('img-container');
	container.classList.add('overlay');
	const img = document.createElement("img");
	img.src = `/api/image?path=${path}&res=${resolution}`;
	container.appendChild(img);
	document.body.appendChild(container);
	container.onclick = () => {
		clearInterval(slideshow);
		container.remove();
	};
}

async function startSlideshow(shuffle=false) {
	clearInterval(slideshow);
	const list = await collectImages(currentPath);
	if (!list.length){
		const msg = "Dind't detect any images!"
		window.alert(msg);
		console.error(msg);
		return
	}
	console.log(list);
	if (shuffle) list.sort(() => Math.random() - 0.5);
	let i = 0;
	openImage(list[0]);
	slideshow = setInterval(() => {
		openImage(list[i++ % list.length]);
		}, slideshow_speed);
}

document.querySelectorAll("#play").forEach(e => e.onclick = () => startSlideshow(false));
document.querySelectorAll("#pause").forEach(e => e.onclick = () => clearInterval(slideshow));
document.querySelectorAll("#shuffle").forEach(e => e.onclick = () => startSlideshow(true));
document.querySelectorAll("#slideshowspeed").forEach(e => e.onchange = () => updateSlideShowSpeed());
document.querySelectorAll("#slideshowspeed").forEach(e => e.onkeydown = () => updateSlideShowSpeed());

document.addEventListener("keydown", (e) => {
	updateItems();
	if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
		e.preventDefault();
		const overlay = document.querySelector('.overlay');
		if (overlay){
			const img = overlay.querySelector('img');
			if (!img) return;

			let currentIndex = images.findIndex(i => i === img.dataset.path);
			if (currentIndex === -1) currentIndex = 0;

			if (e.key ==='ArrowRight' || e.key === 'ArrowDown') {
				currentIndex = (currentIndex + 1) % images.length;
			} else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp'){
				currentIndex = (currentIndex - 1) % images.length;
			}

			img.src = `/api/image?path=${images[currentIndex]}&res=${resolution}`;
			img.dataset.path = images[currentIndex];
		} else {
			moveFocus(e.key);
		}
	} else if (e.key === "Enter") {
		e.preventDefault();
		items[currentIndex].click();
	} else {
		if (document.querySelector(".overlay")) {
			document.querySelector(".overlay").remove();
		}
	}
});

browse();

