const MIN_RECT_SIZE = 5;

const LABELS_AND_TAGS = { Product: ["No Rotation", "Has Rotation"], "Don't care": [], Car: ["Red", "Green", "Blue"] };

$(".my-image").on("dragstart", () => false);
// $(".my-image").attr("src", "ProfilePic.jpg");
// $(".my-image").attr("src", "ProfilePicLandscape.jpg");
$(".my-image").attr("src", "Capture.JPG");

$(".my-image").on("load", resetZoonAndPan);

let currentZoom = 1;
let maxZoom, minZoom;
function resetZoonAndPan() {
	const bodyWidth = $(document.body).width();
	const bodyHeight = $(document.body).height();
	minZoom = Math.min(bodyHeight / $(".annotation-area").height(), bodyWidth / $(".annotation-area").width()) * 0.8;
	maxZoom = minZoom * 10;
	currentZoom = minZoom / 0.8;
	pan.x = (bodyWidth - $(".annotation-area").width() * currentZoom) / 2.5;
	pan.y = 0;
	$(".annotation-area").css({ "--zoom": currentZoom, "--panX": pan.x, "--panY": pan.y });
	$(".current-zoom").text(`${parseInt(currentZoom * 100)}%`);
}

const pan = { x: 0, y: 0 };
$(".annotation-area").on("wheel", function (e) {
	e.preventDefault();
	const deltaX = (e.clientX - pan.x) / currentZoom;
	const deltaY = (e.clientY - pan.y) / currentZoom;
	e.originalEvent.deltaY > 0 ? (currentZoom *= 0.9) : (currentZoom /= 0.9);
	if (currentZoom > maxZoom) return (currentZoom = maxZoom);
	if (currentZoom < minZoom) return (currentZoom = minZoom);
	pan.x = e.clientX - deltaX * currentZoom;
	pan.y = e.clientY - deltaY * currentZoom;

	$(".annotation-area").css({ "--panX": pan.x, "--panY": pan.y, "--zoom": currentZoom });
	$(".current-zoom").text(`${parseInt(currentZoom * 100)}%`);
});

$(document).on("click", ".rect-info", e => {
	$(".active").removeClass("active").trigger("classChange");
	$(".resize").remove();
	activateRect(e.target);
	focusOnRect();
});

const mouseDownCoord = { x: 0, y: 0 };
let resizeDirection;
$(".annotation-area").on("mousedown", e => {
	mouseDownCoord.x = e.clientX - pan.x;
	mouseDownCoord.y = e.clientY - pan.y;
	if (e.button === 2) {
		$(".annotation-area").addClass("panning");
	} else if (!$(e.target).hasClass("active") && !$(e.target).hasClass("resize")) {
		mouseDownCoord.x /= currentZoom;
		mouseDownCoord.y /= currentZoom;
		$(".multiselect").addClass("selecting");
		$(".selecting").css({ "--x": mouseDownCoord.x, "--y": mouseDownCoord.y, "--width": 0, "--height": 0 });
	} else if ($(e.target).hasClass("active")) {
		$(".active").addClass("dragging");
	} else if ($(e.target).hasClass("resize")) {
		resizeDirection = e.target.dataset.direction;
		$(e.target).addClass("resizing");
	}
});

$(document).on("mouseup", function (e) {
	const selectBoxSize = {
		x: parseFloat($(".selecting").css("--x")),
		y: parseFloat($(".selecting").css("--y")),
		width: parseFloat($(".selecting").css("--width")),
		height: parseFloat($(".selecting").css("--height")),
	};
	if (selectBoxSize.width < MIN_RECT_SIZE || selectBoxSize.height < MIN_RECT_SIZE) {
		$(".active").removeClass("active").trigger("classChange");
		$(".resize").remove();
		if ($(e.target).hasClass("rect")) activateRect(e.target);
	} else if ($(".selecting").hasClass("show") && $(".create-new").hasClass("control-active")) {
		createRect(selectBoxSize);
	}

	$(".dragging").removeClass("dragging");
	$(".resizing").removeClass("resizing");
	$(".panning").removeClass("panning");
	$(".selecting").removeClass("selecting show");
});

$(".annotation-area").on("mousemove", e => {
	if (e.pageX < pan.x || e.pageX > pan.x + $(".annotation-area").width() * currentZoom) return;
	if (e.pageY < pan.y || e.pageY > pan.y + $(".annotation-area").height() * currentZoom) return;
	if ($(".panning").length > 0) handlePan(e);
	if ($(".selecting").length > 0) handleSelect(e);
	if ($(".dragging").length > 0) handleDrag(e);
	if ($(".resizing").length > 0) handleResize(e);
});

function handlePan(e) {
	pan.x = e.clientX - mouseDownCoord.x;
	pan.y = e.clientY - mouseDownCoord.y;
	$(".panning").css({ "--panX": pan.x, "--panY": pan.y });
}

function handleSelect(e) {
	const currentCoord = {
		x: (e.clientX - pan.x) / currentZoom,
		y: (e.clientY - pan.y) / currentZoom,
	};
	const deltaX = currentCoord.x - mouseDownCoord.x;
	const deltaY = currentCoord.y - mouseDownCoord.y;

	if (Math.abs(deltaX) < MIN_RECT_SIZE || Math.abs(deltaY) < MIN_RECT_SIZE) return $(".selecting").removeClass("show");
	$(".selecting").addClass("show");

	let width, height, x, y;
	if (deltaX > 0 && deltaY > 0) {
		//++
		x = mouseDownCoord.x;
		y = mouseDownCoord.y;
		width = deltaX;
		height = deltaY;
	}
	if (deltaX > 0 && deltaY < 0) {
		//+-
		x = mouseDownCoord.x;
		y = currentCoord.y;
		width = deltaX;
		height = Math.abs(deltaY);
	}
	if (deltaX < 0 && deltaY > 0) {
		//-+
		x = currentCoord.x;
		y = mouseDownCoord.y;
		width = Math.abs(deltaX);
		height = deltaY;
	}
	if (deltaX < 0 && deltaY < 0) {
		//--
		x = currentCoord.x;
		y = currentCoord.y;
		width = Math.abs(deltaX);
		height = Math.abs(deltaY);
	}
	$(".selecting").css({ "--x": x || 0, "--y": y || 0, "--width": width || 0, "--height": height || 0 });
	if ($(".create-new").hasClass("control-active")) {
		$(".selecting").css("--border-hue", 0);
		$(".active").removeClass("active").trigger("classChange");
		$(".resize").remove();
	} else {
		$(".selecting").css("--border-hue", 250);
		const selectCoord = { x0: x || 0, y0: y || 0, x1: x + width || 0, y1: y + height || 0 };
		$(".rect").each(function () {
			const rectCoord = {
				x0: parseFloat($(this).css("--x")),
				y0: parseFloat($(this).css("--y")),
				x1: parseFloat($(this).css("--x")) + parseFloat($(this).css("--width")),
				y1: parseFloat($(this).css("--y")) + parseFloat($(this).css("--height")),
			};
			if (selectCoord.x1 < rectCoord.x0 || selectCoord.x0 > rectCoord.x1 || selectCoord.y0 > rectCoord.y1 || selectCoord.y1 < rectCoord.y0) {
				$(".resize").remove();
				$(this).removeClass("active").trigger("classChange");
				$(`[data-id="${this.dataset.id}"]`).removeClass("active").trigger("classChange");
			} else {
				$(this).addClass("active").trigger("classChange");
				$(`[data-id="${this.dataset.id}"]`).addClass("active").trigger("classChange");
			}
		});
	}
}

function handleDrag(e) {
	const deltaX = (e.clientX - pan.x - mouseDownCoord.x) / currentZoom;
	const deltaY = (e.clientY - pan.y - mouseDownCoord.y) / currentZoom;
	let inBoundary = true;
	let newLocation = { x: [], y: [] };
	$(".dragging").each(function (i) {
		newLocation.x[i] = parseFloat($(this).css("--x")) + deltaX;
		newLocation.y[i] = parseFloat($(this).css("--y")) + deltaY;
		if (
			newLocation.x[i] < 0 ||
			newLocation.x[i] >= $(".annotation-area").width() - $(this).css("--width") ||
			newLocation.y[i] < 0 ||
			newLocation.y[i] >= $(".annotation-area").height() - $(this).css("--height")
		)
			inBoundary = false;
	});
	$(".dragging").each(function (i) {
		if (inBoundary) {
			$(this).css("--x", newLocation.x[i]);
			$(this).css("--y", newLocation.y[i]);
		}
	});
	mouseDownCoord.x = e.clientX - pan.x;
	mouseDownCoord.y = e.clientY - pan.y;
}

function handleResize(e) {
	const currentX = parseFloat($(".resizing").parent().css("--x"));
	const currentY = parseFloat($(".resizing").parent().css("--y"));
	const currentWidth = parseFloat($(".resizing").parent().css("--width"));
	const currentHeight = parseFloat($(".resizing").parent().css("--height"));
	const deltaX = (e.clientX - pan.x - mouseDownCoord.x) / currentZoom;
	const deltaY = (e.clientY - pan.y - mouseDownCoord.y) / currentZoom;
	let width, height, x, y;
	switch (resizeDirection) {
		case "nw":
			x = currentX + deltaX;
			y = currentY + deltaY;
			width = currentWidth - deltaX;
			height = currentHeight - deltaY;
			break;
		case "n":
			y = currentY + deltaY;
			height = currentHeight - deltaY;
			break;
		case "ne":
			y = currentY + deltaY;
			width = currentWidth + deltaX;
			height = currentHeight - deltaY;
			break;
		case "e":
			width = currentWidth + deltaX;
			break;
		case "se":
			height = currentHeight + deltaY;
			width = currentWidth + deltaX;
			break;
		case "s":
			height = currentHeight + deltaY;
			break;
		case "sw":
			x = currentX + deltaX;
			width = currentWidth - deltaX;
			height = currentHeight + deltaY;
			break;
		case "w":
			x = currentX + deltaX;
			width = currentWidth - deltaX;
			break;
	}

	if (width !== undefined && width > MIN_RECT_SIZE) {
		if (x !== undefined) $(".resizing").parent().css("--x", x);
		$(".resizing").parent().css("--width", width);
		mouseDownCoord.x = e.clientX - pan.x;
	}
	if (height !== undefined && height > MIN_RECT_SIZE) {
		if (y !== undefined) $(".resizing").parent().css("--y", y);
		$(".resizing").parent().css("--height", height);
		mouseDownCoord.y = e.clientY - pan.y;
	}
}

function createRect({ x, y, width, height }) {
	const id = uuidV4();
	const rect = $(`<div class="rect" data-id=${id} data-status="Unlabeled"></div>`);
	rect.css({ "--x": x, "--y": y, "--width": width, "--height": height });
	$(".annotation-area").append(rect);
	const sideItem = $(
		`<div class="rect-info" data-id=${id} data-status="Unlabeled" oncontextmenu="return false"><i class="fa-solid fa-eye-slash hide-btn"></i></div>`
	);
	$(".rect-info-container").append(sideItem);
	$(".count").text($(".rect").length);
}

$(document).on("click", ".hide-btn", e => {
	if ($(e.target).hasClass("hide-all")) {
		$(".rect").hide();
		$(".rect-info").addClass("hidden");
		$(e.target).removeClass("hide-all");
		$(e.target).addClass("show-all");
		return;
	}
	if ($(e.target).hasClass("show-all")) {
		$(".rect").show();
		$(".rect-info").removeClass("hidden");
		$(e.target).removeClass("show-all");
		$(e.target).addClass("hide-all");
		return;
	}
	if ($(e.target).parent().is(".rect-info.hidden")) {
		const id = $(e.target).parent().attr("data-id");
		$(`.rect[data-id="${id}"]`).show();
		$(e.target).parent().removeClass("hidden");
		return;
	}
	if ($(e.target).parent().is(".rect-info:not(.hidden)")) {
		const id = $(e.target).parent().attr("data-id");
		$(`.rect[data-id="${id}"]`).hide();
		$(e.target).parent().addClass("hidden");
		return;
	}
});

function activateRect(target) {
	const rectAndSideItem = $(`[data-id="${target.dataset.id}"]`);
	rectAndSideItem.addClass("active").trigger("classChange");
	const resize = $(`
	<div class="resize nw" data-direction="nw"></div>
	<div class="resize n" data-direction="n"></div>
	<div class="resize ne" data-direction="ne"></div>
	<div class="resize e" data-direction="e"></div>
	<div class="resize se" data-direction="se"></div>
	<div class="resize s" data-direction="s"></div>
	<div class="resize sw" data-direction="sw"></div>
	<div class="resize w" data-direction="w"></div>`);
	rectAndSideItem.each(function () {
		if ($(this).hasClass("rect")) $(this).append(resize);
	});
}

function focusOnRect() {
	if ($(".rect.active").length < 1) return;
	const rectBox = {
		x: parseFloat($(".rect.active").css("--x")),
		y: parseFloat($(".rect.active").css("--y")),
		width: parseFloat($(".rect.active").css("--width")),
		height: parseFloat($(".rect.active").css("--height")),
	};
	currentZoom = Math.min(
		Math.min(($(".annotation-area").height() / rectBox.height) * minZoom, ($(".annotation-area").width() / rectBox.width) * minZoom),
		maxZoom
	);

	pan.x = -rectBox.x * currentZoom + Math.max($(".annotation-area").width() / 30, 100);
	pan.y = -rectBox.y * currentZoom + Math.max($(".annotation-area").height() / 100, 30);

	$(".annotation-area").css({ "--panX": pan.x, "--panY": pan.y, "--zoom": currentZoom });
	$(".current-zoom").text(`${parseInt(currentZoom * 100)}%`);
}

function focusNextRect() {
	if ($(".rect.active").length !== 1) return;
	const nextSibling = $(".rect.active").next(".rect");
	if (nextSibling.length < 1) return;
	$(".active").removeClass("active");
	$(".resize").remove();
	activateRect(nextSibling.get(0));
	focusOnRect();
}
function focusPreviousRect() {
	if ($(".rect.active").length !== 1) return;
	const prevSibling = $(".rect.active").prev(".rect");
	if (prevSibling.length < 1) return;
	$(".active").removeClass("active");
	$(".resize").remove();
	activateRect(prevSibling.get(0));
	focusOnRect();
}

const shortcutKeyMapping = [];
Object.keys(LABELS_AND_TAGS).forEach(label => {
	if (LABELS_AND_TAGS[label].length > 0) {
		LABELS_AND_TAGS[label].forEach(tag => {
			shortcutKeyMapping.push({ label, tag });
			createShortcutTooltip({ label, tag }, shortcutKeyMapping.length);
		});
	} else {
		shortcutKeyMapping.push({ label });
		createShortcutTooltip({ label }, shortcutKeyMapping.length);
	}
});

function createShortcutTooltip({ label, tag }, key) {
	if (key > 9) return;
	const shortcut = $(`<div class="shortcut">
	<p class="key">${key}</p>
	<p>${label}${tag ? ` - ${tag}` : ""}</p>
	<input type="color" class="box-color-picker" value="#14eb31"/>
	</div>`);
	$(".shortcuts-container").append(shortcut);
	const customStyle = $(
		`<style data-custom-style="${label}${tag ? ` - ${tag}` : ""}">
		[data-status="${label}${tag ? ` - ${tag}` : ""}"] {
			border-color: #14eb31;
		}
		</style>`
	);
	$(document.body).append(customStyle);
}

$(document).on("input", ".box-color-picker", e => {
	const selector = `[data-custom-style="${$(e.target).prev("p").text()}"]`;
	const status = `[data-status="${$(e.target).prev("p").text()}"]`;
	$(selector).html(`${status}{border-color: ${$(e.target).val()};}`);
});

$(document).on("keydown", e => {
	if (e.key.toLowerCase() === "a") $(".cursor, .create-new").toggleClass("control-active");
	if (e.key === "Delete" || e.key.toLowerCase() === "d") {
		$(".active").remove();
		$(".count").text($(".rect").length);
		$(".select-label-btn").addClass("disabled");
	}
	if (e.key.toLowerCase() === "s") resetZoonAndPan();
	if (e.key.toLowerCase() === "f") focusOnRect();
	if (e.key === "ArrowDown") focusNextRect();
	if (e.key === "ArrowUp") focusPreviousRect();
	if (e.key === "Escape") $(".active").removeClass("active").trigger("classChange");

	if (shortcutKeyMapping[parseInt(e.key) - 1]) addLabelTag(shortcutKeyMapping[parseInt(e.key) - 1]);
});

function addLabelTag({ label, tag }) {
	const activeRects = $(".active");
	if (activateRect.length < 1) return;
	activeRects.attr("data-label", label);
	activeRects.attr("data-tag", tag ? tag : "no-tag");
	activeRects.attr("data-status", `${label}${tag ? ` - ${tag}` : ""}`);
}

$("#done-btn").on("click", () => {
	const rects = $(".rect");
	const unlabeled = rects.filter(function () {
		return this.dataset.label === undefined || this.dataset.tag === undefined;
	});
	if (unlabeled.length > 0) return alert("Please label all segments");
	const result = [];
	rects.each(function () {
		result.push({
			x: parseFloat($(this).css("--x")),
			y: parseFloat($(this).css("--y")),
			width: parseFloat($(this).css("--width")),
			height: parseFloat($(this).css("--height")),
			label: this.dataset.label,
			tag: this.dataset.tag,
		});
	});
	console.table(result);
	alert("Result is printed in console");
});

$(".cursor, .create-new").on("click", e => {
	$(".control-active").removeClass("control-active");
	$(e.target).addClass("control-active");
});

$(document).on("classChange", ".rect", () => {
	if ($(".active").length > 0) $(".select-label-btn").removeClass("disabled");
	else $(".select-label-btn").addClass("disabled");
});

$(document).on("mouseup", e => {
	if (
		$(e.target).hasClass("fa-caret-right") ||
		$(e.target).children().hasClass("fa-caret-right") ||
		$(e.target).siblings().hasClass("fa-caret-right")
	)
		return;
	contextMenu.close();
	if (e.button === 2 && $(e.target).hasClass("active")) contextMenu.open({ x: e.pageX, y: e.pageY });
});

$(".select-label-btn").on("click", e => {
	if ($(e.target).hasClass("disabled")) return;
	contextMenu.close();
	contextMenu.open({ x: e.pageX + 20, y: e.pageY });
});

const contextMenu = {
	open: location => {
		const menu = $(`<div class="context-menu" style="--x:${location.x}; --y:${location.y}" oncontextmenu="return false"></div>`);
		Object.keys(LABELS_AND_TAGS).forEach(label => {
			const menuItem = $(`<div class="menu-item"><div>${label}</div></div>`);
			if (LABELS_AND_TAGS[label].length > 0) {
				const submenu = $('<div class="submenu" style="display:none;"></div>');
				menuItem.append($('<i class="fa-solid fa-caret-right"></i>'), submenu);
				let t = null;
				menuItem.on("mouseenter", () => {
					if (t) clearTimeout(t);
					submenu.show();
				});
				menuItem.on("mouseleave", () => (t = setTimeout(() => submenu.hide(), 100)));
				LABELS_AND_TAGS[label].forEach(tag => {
					const subItem = $(`<div class="subitem">${tag}</div>`);
					submenu.append(subItem);
					subItem.on("mouseup", () => {
						addLabelTag({ label, tag });
					});
				});
			} else menuItem.on("mouseup", () => addLabelTag({ label }));

			menu.append(menuItem);
		});
		$(document.body).append(menu);
	},
	close: () => {
		$(".context-menu").remove();
	},
};

$(".zoom-in-btn").on("click", () => {
	currentZoom /= 0.98;
	if (currentZoom > maxZoom) return (currentZoom = maxZoom);
	$(".annotation-area").css("--zoom", currentZoom);
	$(".current-zoom").text(`${parseInt(currentZoom * 100)}%`);
});

$(".zoom-out-btn").on("click", () => {
	currentZoom *= 0.98;
	if (currentZoom < minZoom) return (currentZoom = minZoom);
	$(".annotation-area").css("--zoom", currentZoom);
	$(".current-zoom").text(`${parseInt(currentZoom * 100)}%`);
});

$(".reset-zoom-btn").on("click", resetZoonAndPan);

$(".tab-btn").on("click", e => {
	$(".tab-active").removeClass("tab-active");
	$(e.target).addClass("tab-active");
	$(`.${e.target.dataset.tabShow}`).show();
	$(`.${e.target.dataset.tabHide}`).hide();
});

$("#stop-btn").on("click", () => close());

function uuidV4() {
	return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
		(c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
	);
}
