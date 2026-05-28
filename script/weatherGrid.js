// TODO: Figure out how to seperate the days, and black out the hours of the current day that have already passed.
// TODO: Alternatively, add a border around the current hour of the current day

const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const weekDaysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthNames = ["January", "February", "March", "April", "May", "June", "July",
	"August", "September", "October", "November", "December"];

const iconMap = {
	0: 'wi-day-sunny',
	1: 'wi-day-sunny',
	2: 'wi-day-cloudy',
	3: 'wi-cloudy',
	45: 'wi-fog',
	48: 'wi-fog',
	51: 'wi-sprinkle',
	53: 'wi-sprinkle',
	55: 'wi-rain',
	56: 'wi-rain-mix',
	57: 'wi-rain-mix',
	61: 'wi-rain',
	63: 'wi-rain',
	65: 'wi-rain',
	66: 'wi-rain-mix',
	67: 'wi-rain-mix',
	71: 'wi-snow',
	73: 'wi-snow',
	75: 'wi-snow',
	77: 'wi-snow',
	80: 'wi-showers',
	81: 'wi-showers',
	82: 'wi-storm-showers',
	85: 'wi-snow',
	86: 'wi-snow',
	95: 'wi-thunderstorm',
	96: 'wi-thunderstorm',
	99: 'wi-thunderstorm',
	'default': 'wi-alien'
};

const DEFAULT_LATITUDE = 34.0754;
const DEFAULT_LONGITUDE = -84.2941;
const FORECAST_DAYS = 16;
const HOURS_PER_DAY = 24;
const HOURS_TO_SHOW = FORECAST_DAYS * HOURS_PER_DAY;
const BLOCK_SIZE_DIVIDER = 40;
const LEGEND_MIN_TEMP = -10;
const LEGEND_MAX_TEMP = 110;
const LEGEND_SWATCH_COUNT = 120;
const LEGEND_TICK_LABELS = [-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110];
const GRID_CONTAINER = '#graph';
const DEFAULT_ICON_MODE = 'glyph';

var gridRuntime = {
	tooltip: null,
	resizeHandler: null,
	loadGeneration: 0,
	resizeFrame: 0,
	introFrame: 0,
	introComplete: false,
	introProgress: { h: 0, v: 0 },
	activeGrid: null
};

const GRID_INTRO_DURATION_MS = 1500;
const GRID_CHROME_FADE_MS = 500;

function buildOpenMeteoUrl(latitude, longitude) {
	var lat = latitude != null ? latitude : DEFAULT_LATITUDE;
	var lon = longitude != null ? longitude : DEFAULT_LONGITUDE;
	return 'https://api.open-meteo.com/v1/forecast?latitude=' + lat
		+ '&longitude=' + lon
		+ '&hourly=temperature_2m,weathercode&temperature_unit=fahrenheit&forecast_days='
		+ FORECAST_DAYS + '&timezone=auto';
}

function formatAMPM(date) {
	var hours = date.getHours();
	var ampm = hours >= 12 ? 'PM' : 'AM';
	hours = hours % 12;
	hours = hours ? hours : 12;
	return hours + ampm;
}

function getIconClass(weatherCode) {
	return iconMap[weatherCode] || iconMap['default'];
}

function parseUrlParam(name) {
	var params = new URLSearchParams(window.location.search);
	return params.get(name);
}

function getIconRenderMode() {
	var mode = parseUrlParam('icons');
	if (!mode) {
		return DEFAULT_ICON_MODE;
	}
	mode = mode.toLowerCase();
	return mode === 'svg' ? 'svg' : 'glyph';
}

function svgTemplate(body) {
	return '<svg viewBox="0 0 24 24" class="grid-weather-svg" aria-hidden="true" focusable="false">'
		+ body + '</svg>';
}

function weatherIconSvg(iconClass) {
	switch (iconClass) {
		case 'wi-day-sunny':
			return svgTemplate('<circle cx="12" cy="12" r="4"></circle>'
				+ '<line x1="12" y1="2.5" x2="12" y2="5"></line>'
				+ '<line x1="12" y1="19" x2="12" y2="21.5"></line>'
				+ '<line x1="2.5" y1="12" x2="5" y2="12"></line>'
				+ '<line x1="19" y1="12" x2="21.5" y2="12"></line>'
				+ '<line x1="5.2" y1="5.2" x2="7" y2="7"></line>'
				+ '<line x1="17" y1="17" x2="18.8" y2="18.8"></line>'
				+ '<line x1="5.2" y1="18.8" x2="7" y2="17"></line>'
				+ '<line x1="17" y1="7" x2="18.8" y2="5.2"></line>');
		case 'wi-day-cloudy':
			return svgTemplate('<circle cx="8.5" cy="8.5" r="2.8"></circle>'
				+ '<path d="M7 18h10a3 3 0 0 0 0-6 4.7 4.7 0 0 0-8.8-1.3A3.2 3.2 0 0 0 7 18z"></path>');
		case 'wi-fog':
			return svgTemplate('<path d="M6.5 14h10.5a3.5 3.5 0 0 0 .1-7 5.3 5.3 0 0 0-10.1-1.1A3.7 3.7 0 0 0 6.5 14z"></path>'
				+ '<line x1="5" y1="17" x2="19" y2="17"></line>'
				+ '<line x1="6.5" y1="20" x2="17.5" y2="20"></line>');
		case 'wi-sprinkle':
		case 'wi-rain':
		case 'wi-rain-mix':
		case 'wi-showers':
			return svgTemplate('<path d="M6.5 14h10.5a3.5 3.5 0 0 0 .1-7 5.3 5.3 0 0 0-10.1-1.1A3.7 3.7 0 0 0 6.5 14z"></path>'
				+ '<line x1="9" y1="16.5" x2="8" y2="19.5"></line>'
				+ '<line x1="13" y1="16.5" x2="12" y2="20.5"></line>'
				+ '<line x1="17" y1="16.5" x2="16" y2="19.5"></line>');
		case 'wi-snow':
			return svgTemplate('<path d="M6.5 14h10.5a3.5 3.5 0 0 0 .1-7 5.3 5.3 0 0 0-10.1-1.1A3.7 3.7 0 0 0 6.5 14z"></path>'
				+ '<path d="M8.2 18.2h2m-1-1v2m-.7-1.7l1.4 1.4m0-1.4l-1.4 1.4"></path>'
				+ '<path d="M12.8 18.2h2m-1-1v2m-.7-1.7l1.4 1.4m0-1.4l-1.4 1.4"></path>');
		case 'wi-thunderstorm':
		case 'wi-storm-showers':
			return svgTemplate('<path d="M6.5 14h10.5a3.5 3.5 0 0 0 .1-7 5.3 5.3 0 0 0-10.1-1.1A3.7 3.7 0 0 0 6.5 14z"></path>'
				+ '<polyline points="12 14.8 10 18.8 12.8 18.8 11.1 22 15 17.2 12.5 17.2 14 14.8"></polyline>');
		case 'wi-cloudy':
		default:
			return svgTemplate('<path d="M6.5 18h10.5a3.5 3.5 0 0 0 .1-7 5.3 5.3 0 0 0-10.1-1.1A3.7 3.7 0 0 0 6.5 18z"></path>');
	}
}

function temperatureFill(temps, i, scales) {
	var t = temps[i];
	if (t < 130 && t >= 100) return scales.color4(t);
	if (t < 100 && t >= 80) return scales.color3(t);
	if (t < 80 && t >= 60) return scales.color2(t);
	if (t < 60 && t >= 30) return scales.color1(t);
	if (t < 30 && t >= -10) return scales.color0(t);
	if (t < -10 && t >= -50) return scales.colorc(t);
	return d3.rgb(0, 0, 0);
}

function createColorScales() {
	return {
		colorc: d3.scale.linear().domain([-50, -10]).range([d3.rgb(0, 0, 0), d3.rgb(128, 0, 128)]),
		color0: d3.scale.linear().domain([-10, 30]).range([d3.rgb(128, 0, 128), d3.rgb(0, 0, 255)]),
		color1: d3.scale.linear().domain([30, 60]).range([d3.rgb(0, 0, 255), d3.rgb(185, 248, 255)]),
		color2: d3.scale.linear().domain([60, 80]).range([d3.rgb(185, 248, 255), d3.rgb(255, 140, 54)]),
		color3: d3.scale.linear().domain([80, 100]).range([d3.rgb(255, 140, 54), d3.rgb(255, 0, 0)]),
		color4: d3.scale.linear().domain([100, 130]).range([d3.rgb(255, 0, 0), d3.rgb(0, 0, 0)])
	};
}

function gridX(i, blockSize, viewportWidth) {
	return (i % HOURS_PER_DAY + 1) * blockSize + viewportWidth / 2 - (blockSize * 14);
}

function gridY(i, blockSize) {
	return (Math.floor(i / HOURS_PER_DAY) + 1) * blockSize;
}

function cellSize(blockSize) {
	return blockSize - 2;
}

function gridIconHtml(weatherCode) {
	var iconClass = getIconClass(weatherCode);
	if (getIconRenderMode() === 'svg') {
		return weatherIconSvg(iconClass);
	}
	return '<span class="grid-glyph-box"><i class="wi ' + iconClass + '"></i></span>';
}

function rowLabelY(dayIndex, blockSize) {
	return (dayIndex + 1) * blockSize + blockSize / 2;
}

function rowLabelX(gridLeft) {
	return gridLeft - 8;
}

function rowLabelFontSize(blockSize) {
	return Math.max(10, Math.min(14, blockSize * 0.28));
}

function buildDayLabels(hourTimes, numDays, blockSize) {
	var labels = [];
	var useFullWeekday = blockSize >= 22;

	for (var day = 0; day < numDays; day++) {
		var date = hourTimes[day * HOURS_PER_DAY];
		labels.push({
			dayIndex: day,
			weekday: useFullWeekday ? weekDays[date.getDay()] : weekDaysShort[date.getDay()],
			dateLine: monthNamesShort[date.getMonth()] + ' ' + date.getDate()
		});
	}
	return labels;
}

function appendDayLabelTspans(textSelection, labelX, label) {
	textSelection.selectAll('tspan').remove();
	textSelection.append('tspan')
		.attr('x', labelX)
		.attr('dy', '-0.35em')
		.text(label.weekday);
	textSelection.append('tspan')
		.attr('x', labelX)
		.attr('dy', '1.15em')
		.text(label.dateLine);
}

function syncDayLabelTspans(textSelection, labelX, label, refreshText) {
	if (refreshText || textSelection.selectAll('tspan').empty()) {
		appendDayLabelTspans(textSelection, labelX, label);
		return;
	}
	textSelection.selectAll('tspan').attr('x', labelX);
}

function getGridBounds(blockSize, viewportWidth) {
	var gridLeft = gridX(0, blockSize, viewportWidth);
	var gridRight = gridX(HOURS_PER_DAY - 1, blockSize, viewportWidth) + blockSize - 2;
	return {
		gridLeft: gridLeft,
		gridWidth: gridRight - gridLeft
	};
}

function legendTempToFraction(temp) {
	return (temp - LEGEND_MIN_TEMP) / (LEGEND_MAX_TEMP - LEGEND_MIN_TEMP);
}

function legendTickX(temp, gridLeft, gridWidth) {
	return gridLeft + legendTempToFraction(temp) * gridWidth;
}

function legendTickAnchor(index, tickCount) {
	if (index === 0) {
		return 'start';
	}
	if (index === tickCount - 1) {
		return 'end';
	}
	return 'middle';
}

function computeLayout(viewportWidth, numDays) {
	var blockSize = viewportWidth / BLOCK_SIZE_DIVIDER;
	var gridBounds = getGridBounds(blockSize, viewportWidth);
	var gridBottom = (numDays + 1) * blockSize;
	var legendBarHeight = Math.max(12, blockSize * 0.45);
	var legendGap = blockSize * 0.35;
	var legendBarY = gridBottom + legendGap;
	var legendLabelY = legendBarY + legendBarHeight + 16;
	var contentHeight = legendLabelY + 8;
	return {
		blockSize: blockSize,
		gridLeft: gridBounds.gridLeft,
		gridWidth: gridBounds.gridWidth,
		gridBottom: gridBottom,
		legendBarY: legendBarY,
		legendBarHeight: legendBarHeight,
		legendLabelY: legendLabelY,
		contentHeight: contentHeight
	};
}

function easeInOutCubic(t) {
	return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function applyIntroFrame(animatedLayer, layout, viewportWidth, hProgress, vProgress) {
	gridRuntime.introProgress.h = hProgress;
	gridRuntime.introProgress.v = vProgress;

	var hEased = easeInOutCubic(hProgress);
	var vEased = easeInOutCubic(vProgress);
	var originX = gridX(0, layout.blockSize, viewportWidth);
	var originY = gridY(0, layout.blockSize);
	var size = cellSize(layout.blockSize);

	animatedLayer.selectAll("rect.grid-cell")
		.attr("x", function (d, i) {
			var targetX = gridX(i, layout.blockSize, viewportWidth);
			return originX + (targetX - originX) * hEased;
		})
		.attr("y", function (d, i) {
			var targetY = gridY(i, layout.blockSize);
			return originY + (targetY - originY) * vEased;
		})
		.attr("width", size)
		.attr("height", size);
}

function setGridChromeOpacity(animatedLayer, opacity) {
	animatedLayer.selectAll("text.day-row-label, rect.legend-swatch, text.legend-label, foreignObject.grid-icon")
		.attr("opacity", opacity);
}

function fadeInGridChrome(animatedLayer) {
	var fadeStart = null;

	function runFadeFrame(timestamp) {
		if (!fadeStart) {
			fadeStart = timestamp;
		}
		var progress = Math.min((timestamp - fadeStart) / GRID_CHROME_FADE_MS, 1);
		setGridChromeOpacity(animatedLayer, progress);
		if (progress < 1) {
			gridRuntime.introFrame = window.requestAnimationFrame(runFadeFrame);
			return;
		}
		gridRuntime.introFrame = 0;
	}

	gridRuntime.introFrame = window.requestAnimationFrame(runFadeFrame);
}

function cancelGridIntro() {
	if (gridRuntime.introFrame) {
		window.cancelAnimationFrame(gridRuntime.introFrame);
		gridRuntime.introFrame = 0;
	}
}

function animateGridIntro(animatedLayer, layout, viewportWidth, onComplete) {
	cancelGridIntro();
	gridRuntime.introComplete = false;
	gridRuntime.introProgress = { h: 0, v: 0 };
	setGridChromeOpacity(animatedLayer, 0);

	var phase = "horizontal";
	var phaseStart = null;

	function runFrame(timestamp) {
		if (!phaseStart) {
			phaseStart = timestamp;
		}

		var elapsed = timestamp - phaseStart;
		var progress = Math.min(elapsed / GRID_INTRO_DURATION_MS, 1);

		if (phase === "horizontal") {
			applyIntroFrame(animatedLayer, layout, viewportWidth, progress, 0);
			if (progress < 1) {
				gridRuntime.introFrame = window.requestAnimationFrame(runFrame);
				return;
			}
			phase = "vertical";
			phaseStart = null;
			gridRuntime.introFrame = window.requestAnimationFrame(runFrame);
			return;
		}

		applyIntroFrame(animatedLayer, layout, viewportWidth, 1, progress);
		if (progress < 1) {
			gridRuntime.introFrame = window.requestAnimationFrame(runFrame);
			return;
		}

		gridRuntime.introFrame = 0;
		gridRuntime.introComplete = true;
		gridRuntime.introProgress = { h: 1, v: 1 };
		onComplete();
	}

	gridRuntime.introFrame = window.requestAnimationFrame(runFrame);
}

function runGridIntro(animatedLayer, layout, viewportWidth, applyLayout) {
	var originX = gridX(0, layout.blockSize, viewportWidth);
	var originY = gridY(0, layout.blockSize);
	var originSize = cellSize(layout.blockSize);

	animatedLayer.selectAll("rect.grid-cell")
		.attr("x", originX)
		.attr("y", originY)
		.attr("width", originSize)
		.attr("height", originSize);
	setGridChromeOpacity(animatedLayer, 0);
	applyLayout(false, true);
	animateGridIntro(animatedLayer, layout, viewportWidth, function () {
		applyLayout(false);
		setGridChromeOpacity(animatedLayer, 0);
		fadeInGridChrome(animatedLayer);
	});
}

function replayGridIntro() {
	var active = gridRuntime.activeGrid;
	if (!active || !active.animatedLayer) {
		return;
	}
	runGridIntro(active.animatedLayer, active.layout, active.viewportWidth, active.applyLayout);
}

function clearGrid() {
	d3.select(GRID_CONTAINER).selectAll('*').remove();
	if (gridRuntime.resizeHandler) {
		window.removeEventListener('resize', gridRuntime.resizeHandler);
		gridRuntime.resizeHandler = null;
	}
	if (gridRuntime.resizeFrame) {
		window.cancelAnimationFrame(gridRuntime.resizeFrame);
		gridRuntime.resizeFrame = 0;
	}
	cancelGridIntro();
	gridRuntime.introComplete = false;
	gridRuntime.activeGrid = null;
}

function renderWeatherGrid(containerSelector, temps, hourTimes, weatherCodes, tooltip) {
	var numDays = temps.length / HOURS_PER_DAY;
	var margins = [10, 10, 10, 10];

	var w = window;
	var d = document;
	var e = d.documentElement;
	var g = d.getElementsByTagName('body')[0];
	var viewportWidth = w.innerWidth || e.clientWidth || g.clientWidth;

	var layout = computeLayout(viewportWidth, numDays);
	var svg = d3.select(containerSelector).append("svg:svg")
		.attr("class", "weather-grid-svg")
		.attr("width", viewportWidth)
		.attr("height", layout.contentHeight + margins[0] + margins[2]);

	var graph = svg.append("svg:g")
		.attr("transform", "translate(" + margins[3] + "," + margins[0] + ")");
	var animatedLayer = graph.append("svg:g")
		.attr("class", "animated-layer");

	var scales = createColorScales();

	var gridRects = animatedLayer.selectAll("rect.grid-cell")
		.data(temps, String);

	gridRects.enter().append("svg:rect")
		.attr("class", "grid-cell")
		.attr("x", function (d, i) { return gridX(i, layout.blockSize, viewportWidth); })
		.attr("y", function (d, i) { return gridY(i, layout.blockSize); })
		.attr("width", layout.blockSize - 2)
		.attr("height", layout.blockSize - 2)
		.attr("fill", function (d, i) { return temperatureFill(temps, i, scales); });

	var gridIcons = animatedLayer.selectAll("foreignObject.grid-icon")
		.data(temps, String);

	gridIcons.enter().append("foreignObject")
		.attr("class", "grid-icon")
		.attr("x", function (d, i) { return gridX(i, layout.blockSize, viewportWidth); })
		.attr("y", function (d, i) { return gridY(i, layout.blockSize); })
		.attr("width", cellSize(layout.blockSize))
		.attr("height", cellSize(layout.blockSize))
		.append("xhtml:div")
		.attr("class", "grid-icon-cell")
		.html(function (d, i) { return gridIconHtml(weatherCodes[i]); })
		.on("mouseover", function (d, i) {
			var index = i;
			var date = hourTimes[index];
			tooltip.transition().duration(200).style("opacity", 0.9);
			tooltip.html(
				weekDays[date.getDay()] + ", " + monthNames[date.getMonth()] + " " + date.getDate() + ", " + formatAMPM(date) + "<br />"
				+ Math.round(temps[index]) + " degrees F."
			)
				.style("left", d3.event.pageX + "px")
				.style("top", (d3.event.pageY - 28) + "px");
		})
		.on("mouseout", function () {
			tooltip.transition().duration(500).style("opacity", 0);
		});

	var dayLabels = buildDayLabels(hourTimes, numDays, layout.blockSize);
	var labelX = rowLabelX(layout.gridLeft);
	var labelFontSize = rowLabelFontSize(layout.blockSize);

	var dayRowLabels = animatedLayer.selectAll('text.day-row-label')
		.data(dayLabels);

	dayRowLabels.enter().append('text')
		.attr('class', 'day-row-label')
		.attr('text-anchor', 'end')
		.attr('fill', 'LightSteelBlue')
		.attr('font-family', 'sans-serif')
		.attr('font-size', labelFontSize + 'px')
		.attr('x', labelX)
		.attr('y', function (d) { return rowLabelY(d.dayIndex, layout.blockSize); })
		.each(function (d) {
			appendDayLabelTspans(d3.select(this), labelX, d);
		});
	dayRowLabels = animatedLayer.selectAll('text.day-row-label');

	var legendTemps = [];
	for (var j = LEGEND_MIN_TEMP; j < LEGEND_MAX_TEMP; j++) {
		legendTemps.push(j);
	}

	var legendSwatchWidth = layout.gridWidth / LEGEND_SWATCH_COUNT;

	var legendSwatches = animatedLayer.selectAll("rect.legend-swatch")
		.data(legendTemps);

	legendSwatches.enter().append("svg:rect")
		.attr("class", "legend-swatch")
		.attr("x", function (d, i) { return layout.gridLeft + (i * legendSwatchWidth); })
		.attr("y", layout.legendBarY)
		.attr("width", legendSwatchWidth + 0.5)
		.attr("height", layout.legendBarHeight)
		.attr("fill", function (d, i) { return temperatureFill(legendTemps, i, scales); });
	legendSwatches = animatedLayer.selectAll("rect.legend-swatch");

	var legendTicks = animatedLayer.selectAll("text.legend-label")
		.data(LEGEND_TICK_LABELS);

	legendTicks.enter().append("text")
		.attr("class", "legend-label")
		.text(function (d) { return d + ' F'; })
		.attr("x", function (d) { return legendTickX(d, layout.gridLeft, layout.gridWidth); })
		.attr("y", layout.legendLabelY)
		.attr("text-anchor", function (d, i) { return legendTickAnchor(i, LEGEND_TICK_LABELS.length); })
		.attr("fill", "#e8eef4")
		.attr("stroke", "#1a1a1a")
		.attr("stroke-width", 3)
		.attr("paint-order", "stroke")
		.attr("font-family", "sans-serif")
		.attr("font-size", "12px");
	legendTicks = animatedLayer.selectAll("text.legend-label");

	function applyLayout(refreshDayText, skipCells) {
		// D3 v2 enter() selections do not include appended nodes; always re-query live nodes.
		svg
			.attr("width", viewportWidth)
			.attr("height", layout.contentHeight + margins[0] + margins[2]);

		if (skipCells) {
			return;
		}

		animatedLayer.selectAll("rect.grid-cell")
			.attr("x", function (d, i) { return gridX(i, layout.blockSize, viewportWidth); })
			.attr("y", function (d, i) { return gridY(i, layout.blockSize); })
			.attr("width", layout.blockSize - 2)
			.attr("height", layout.blockSize - 2);

		animatedLayer.selectAll("foreignObject.grid-icon")
			.attr("x", function (d, i) { return gridX(i, layout.blockSize, viewportWidth); })
			.attr("y", function (d, i) { return gridY(i, layout.blockSize); })
			.attr("width", cellSize(layout.blockSize))
			.attr("height", cellSize(layout.blockSize));

		legendSwatchWidth = layout.gridWidth / LEGEND_SWATCH_COUNT;

		animatedLayer.selectAll("rect.legend-swatch")
			.attr("x", function (d, i) { return layout.gridLeft + (i * legendSwatchWidth); })
			.attr("y", layout.legendBarY)
			.attr("width", legendSwatchWidth + 0.5)
			.attr("height", layout.legendBarHeight);

		animatedLayer.selectAll("text.legend-label")
			.attr("x", function (d) { return legendTickX(d, layout.gridLeft, layout.gridWidth); })
			.attr("y", layout.legendLabelY)
			.attr("font-size", Math.max(10, Math.min(14, layout.blockSize * 0.32)) + "px");

		labelX = rowLabelX(layout.gridLeft);
		labelFontSize = rowLabelFontSize(layout.blockSize);

		if (refreshDayText) {
			dayLabels = buildDayLabels(hourTimes, numDays, layout.blockSize);
			animatedLayer.selectAll('text.day-row-label').data(dayLabels);
		}

		animatedLayer.selectAll('text.day-row-label')
			.attr('font-size', labelFontSize + 'px')
			.attr('x', labelX)
			.attr('y', function (d) { return rowLabelY(d.dayIndex, layout.blockSize); })
			.each(function (d) {
				syncDayLabelTspans(d3.select(this), labelX, d, refreshDayText);
			});

	}

	function updateWindow() {
		if (gridRuntime.resizeFrame) {
			window.cancelAnimationFrame(gridRuntime.resizeFrame);
		}
		gridRuntime.resizeFrame = window.requestAnimationFrame(function () {
			gridRuntime.resizeFrame = 0;
			var usedFullWeekdayBefore = layout.blockSize >= 22;
			viewportWidth = w.innerWidth || e.clientWidth || g.clientWidth;
			layout = computeLayout(viewportWidth, numDays);
			if (gridRuntime.activeGrid) {
				gridRuntime.activeGrid.layout = layout;
				gridRuntime.activeGrid.viewportWidth = viewportWidth;
			}
			var usedFullWeekdayAfter = layout.blockSize >= 22;
			if (!gridRuntime.introComplete) {
				applyLayout(usedFullWeekdayBefore !== usedFullWeekdayAfter, true);
				applyIntroFrame(
					animatedLayer,
					layout,
					viewportWidth,
					gridRuntime.introProgress.h,
					gridRuntime.introProgress.v
				);
				return;
			}
			applyLayout(usedFullWeekdayBefore !== usedFullWeekdayAfter);
		});
	}

	gridRuntime.resizeHandler = updateWindow;
	window.addEventListener('resize', updateWindow);

	gridRuntime.activeGrid = {
		animatedLayer: animatedLayer,
		layout: layout,
		viewportWidth: viewportWidth,
		applyLayout: applyLayout
	};
	runGridIntro(animatedLayer, layout, viewportWidth, applyLayout);
}

function wireReplayIntroButton() {
	var btn = document.getElementById('replay-grid-intro');
	if (!btn || btn.getAttribute('data-wired') === 'true') {
		return;
	}
	btn.setAttribute('data-wired', 'true');
	btn.addEventListener('click', replayGridIntro);
}

function initWeatherGrid() {
	if (!gridRuntime.tooltip) {
		gridRuntime.tooltip = d3.select("body").append("div")
			.attr("class", "tooltip")
			.style("opacity", 0);
	}
	wireReplayIntroButton();
}

function loadWeatherForLocation(location) {
	var lat = location.latitude;
	var lon = location.longitude;
	var loadId = ++gridRuntime.loadGeneration;

	clearGrid();

	return fetch(buildOpenMeteoUrl(lat, lon))
		.then(function (response) {
			if (!response.ok) {
				throw new Error('Open-Meteo request failed: ' + response.status);
			}
			return response.json();
		})
		.then(function (data) {
			if (loadId !== gridRuntime.loadGeneration) {
				return;
			}
			var times = data.hourly.time.slice(0, HOURS_TO_SHOW);
			var temps = data.hourly.temperature_2m.slice(0, HOURS_TO_SHOW);
			var weatherCodes = data.hourly.weathercode.slice(0, HOURS_TO_SHOW);
			var hourTimes = times.map(function (t) { return new Date(t); });

			renderWeatherGrid(GRID_CONTAINER, temps, hourTimes, weatherCodes, gridRuntime.tooltip);
		});
}

window.WeatherGrid = {
	init: initWeatherGrid,
	load: loadWeatherForLocation,
	replayIntro: replayGridIntro
};

// Pages without location search load a default grid; pages with #location-input use locationSearch.js.
function bootDefaultGridIfNeeded() {
	if (document.getElementById('location-input')) {
		return;
	}
	initWeatherGrid();
	loadWeatherForLocation({
		latitude: DEFAULT_LATITUDE,
		longitude: DEFAULT_LONGITUDE
	});
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', bootDefaultGridIfNeeded);
} else {
	bootDefaultGridIfNeeded();
}
