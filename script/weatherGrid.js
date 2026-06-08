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

// WMO weather interpretation codes (Open-Meteo weathercode).
const weatherCodeDescriptions = {
	0: 'Clear',
	1: 'Mainly clear',
	2: 'Partly cloudy',
	3: 'Overcast',
	45: 'Fog',
	48: 'Rime fog',
	51: 'Light drizzle',
	53: 'Drizzle',
	55: 'Heavy drizzle',
	56: 'Freezing drizzle',
	57: 'Heavy freezing drizzle',
	61: 'Light rain',
	63: 'Rain',
	65: 'Heavy rain',
	66: 'Freezing rain',
	67: 'Heavy freezing rain',
	71: 'Light snow',
	73: 'Snow',
	75: 'Heavy snow',
	77: 'Snow grains',
	80: 'Light rain showers',
	81: 'Rain showers',
	82: 'Heavy rain showers',
	85: 'Light snow showers',
	86: 'Heavy snow showers',
	95: 'Thunderstorm',
	96: 'Thunderstorm with hail',
	99: 'Thunderstorm with heavy hail'
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
const OPTIONS_STORAGE_KEY = 'hourlyWeather.showTemperatureInCells';
const PRECIP_ICONS_STORAGE_KEY = 'hourlyWeather.showWeatherIconsInPrecip';
const TEMP_UNIT_STORAGE_KEY = 'hourlyWeather.temperatureUnit';
const GRID_MODE_STORAGE_KEY = 'hourlyWeather.gridMode';
const GRID_MODE_TEMPERATURE = 'temperature';
const GRID_MODE_PRECIPITATION = 'precipitation';
const GRID_MODE_CLOUD_COVER = 'cloudcover';
const PERCENT_LEGEND_MIN = 0;
const PERCENT_LEGEND_MAX = 100;
const PERCENT_LEGEND_SWATCH_COUNT = 100;
const PERCENT_LEGEND_TICK_LABELS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

var gridRuntime = {
	tooltip: null,
	resizeHandler: null,
	loadGeneration: 0,
	resizeFrame: 0,
	introFrame: 0,
	introComplete: false,
	introProgress: { h: 0, v: 0 },
	currentHourIndex: -1,
	activeGrid: null,
	useMockData: false,
	showCellIndices: false,
	showTemperatureInCells: false,
	showWeatherIconsInPrecip: false,
	gridMode: GRID_MODE_TEMPERATURE,
	temperatureUnit: 'fahrenheit',
	lastForecastData: null,
	lastForecastDataUnit: 'fahrenheit',
	lastLocation: null,
	skipNextIntro: false
};

const GRID_INTRO_DURATION_MS = 1500;
const GRID_INTRO_CELL_FADE_MS = 300;
const GRID_INTRO_CELL_PAUSE_MS = 300;
const GRID_CHROME_FADE_MS = 500;

function parseCoordinate(value, fallback) {
	var parsed = typeof value === 'number' ? value : parseFloat(value);
	if (!isFinite(parsed)) {
		return fallback;
	}
	return parsed;
}

function normalizeLocationCoords(location) {
	var fallbackLat = DEFAULT_LATITUDE;
	var fallbackLon = DEFAULT_LONGITUDE;
	if (!location || typeof location !== 'object') {
		return {
			latitude: fallbackLat,
			longitude: fallbackLon,
			label: 'Atlanta, Georgia, United States'
		};
	}
	var lat = parseCoordinate(location.latitude, fallbackLat);
	var lon = parseCoordinate(location.longitude, fallbackLon);
	if (lat < -90 || lat > 90) {
		lat = fallbackLat;
	}
	if (lon < -180 || lon > 180) {
		lon = fallbackLon;
	}
	return {
		latitude: lat,
		longitude: lon,
		label: location.label || (lat.toFixed(2) + ', ' + lon.toFixed(2))
	};
}

function buildOpenMeteoUrl(latitude, longitude, useMinimalHourly) {
	var lat = parseCoordinate(latitude, DEFAULT_LATITUDE);
	var lon = parseCoordinate(longitude, DEFAULT_LONGITUDE);
	var unit = gridRuntime.temperatureUnit === 'celsius' ? 'celsius' : 'fahrenheit';
	var hourly = useMinimalHourly
		? 'temperature_2m,weathercode'
		: 'temperature_2m,weathercode,precipitation_probability,cloudcover';
	return 'https://api.open-meteo.com/v1/forecast?latitude=' + lat
		+ '&longitude=' + lon
		+ '&hourly=' + hourly + '&temperature_unit=' + unit
		+ '&forecast_days=' + FORECAST_DAYS + '&timezone=auto';
}

function validateForecastData(data) {
	if (!data || data.error || !data.hourly) {
		return 'Weather API returned an unexpected response.';
	}
	if (!data.hourly.time || !data.hourly.temperature_2m || !data.hourly.weathercode) {
		return 'Weather API response is missing required hourly data.';
	}
	if (!data.hourly.time.length) {
		return 'Weather API returned no forecast hours.';
	}
	return null;
}

function normalizeGridMode(mode) {
	if (mode === GRID_MODE_PRECIPITATION || mode === GRID_MODE_CLOUD_COVER) {
		return mode;
	}
	return GRID_MODE_TEMPERATURE;
}

function isTemperatureGridMode() {
	return gridRuntime.gridMode === GRID_MODE_TEMPERATURE;
}

function isPrecipitationGridMode() {
	return gridRuntime.gridMode === GRID_MODE_PRECIPITATION;
}

function isCloudCoverGridMode() {
	return gridRuntime.gridMode === GRID_MODE_CLOUD_COVER;
}

function isPercentOverlayGridMode() {
	return isPrecipitationGridMode() || isCloudCoverGridMode();
}

function shouldShowCellValues() {
	return isPercentOverlayGridMode() || gridRuntime.showTemperatureInCells;
}

function shouldShowWeatherIcons() {
	if (isTemperatureGridMode()) {
		return true;
	}
	return isPrecipitationGridMode() && gridRuntime.showWeatherIconsInPrecip;
}

function usesCompactIconCellLayout() {
	return shouldShowWeatherIcons() && shouldShowCellValues();
}

function estimatePrecipProbabilityFromWeatherCode(weatherCode) {
	if (weatherCode === 95 || weatherCode === 96 || weatherCode === 99) {
		return 85;
	}
	if (weatherCode === 65 || weatherCode === 82 || weatherCode === 86) {
		return 75;
	}
	if (weatherCode === 61 || weatherCode === 63 || weatherCode === 80 || weatherCode === 81) {
		return 60;
	}
	if (weatherCode === 51 || weatherCode === 53 || weatherCode === 55 || weatherCode === 56 || weatherCode === 57) {
		return 40;
	}
	if (weatherCode === 45 || weatherCode === 48) {
		return 25;
	}
	if (weatherCode === 3) {
		return 15;
	}
	return 5;
}

function getPrecipitationProbabilities(forecastData) {
	if (forecastData.hourly.precipitation_probability) {
		return forecastData.hourly.precipitation_probability.slice(0, HOURS_TO_SHOW);
	}
	return forecastData.hourly.weathercode.slice(0, HOURS_TO_SHOW).map(estimatePrecipProbabilityFromWeatherCode);
}

function estimateCloudCoverFromWeatherCode(weatherCode) {
	if (weatherCode === 0 || weatherCode === 1) {
		return 15;
	}
	if (weatherCode === 2) {
		return 45;
	}
	if (weatherCode === 3) {
		return 95;
	}
	if (weatherCode === 45 || weatherCode === 48) {
		return 85;
	}
	if (weatherCode >= 51 && weatherCode <= 67) {
		return 80;
	}
	if (weatherCode >= 71 && weatherCode <= 86) {
		return 75;
	}
	if (weatherCode >= 95) {
		return 90;
	}
	return 55;
}

function getCloudCoverValues(forecastData) {
	var cloudcover = forecastData.hourly.cloudcover || forecastData.hourly.cloud_cover;
	if (cloudcover) {
		return cloudcover.slice(0, HOURS_TO_SHOW);
	}
	return forecastData.hourly.weathercode.slice(0, HOURS_TO_SHOW).map(estimateCloudCoverFromWeatherCode);
}

function getPercentLegendSettings() {
	return {
		min: PERCENT_LEGEND_MIN,
		max: PERCENT_LEGEND_MAX,
		swatchCount: PERCENT_LEGEND_SWATCH_COUNT,
		tickLabels: PERCENT_LEGEND_TICK_LABELS,
		unitSuffix: '%'
	};
}

function getCellValuesFromForecast(forecastData) {
	if (isPrecipitationGridMode()) {
		return getPrecipitationProbabilities(forecastData);
	}
	if (isCloudCoverGridMode()) {
		return getCloudCoverValues(forecastData);
	}
	return getDisplayTemps(forecastData);
}

function getLegendForGrid() {
	if (isPercentOverlayGridMode()) {
		return getPercentLegendSettings();
	}
	return getLegendSettings(gridRuntime.temperatureUnit);
}

function createScalesForGrid() {
	if (isPrecipitationGridMode()) {
		return {
			overlay: d3.scale.linear()
				.domain([0, 100])
				.range([d3.rgb(255, 255, 255), d3.rgb(0, 40, 120)])
		};
	}
	if (isCloudCoverGridMode()) {
		return {
			overlay: d3.scale.linear()
				.domain([0, 100])
				.range([d3.rgb(255, 255, 255), d3.rgb(55, 55, 55)])
		};
	}
	return createColorScales(gridRuntime.temperatureUnit);
}

function percentOverlayFill(value, scales) {
	if (value == null || isNaN(value)) {
		return d3.rgb(255, 255, 255);
	}
	return scales.overlay(Math.max(0, Math.min(100, value)));
}

function cellFill(cellValues, hourIndex, scales) {
	if (isPercentOverlayGridMode()) {
		return percentOverlayFill(cellValues[hourIndex], scales);
	}
	return temperatureFill(cellValues, hourIndex, scales);
}

function fahrenheitToCelsius(f) {
	return (f - 32) * 5 / 9;
}

function celsiusToFahrenheit(c) {
	return c * 9 / 5 + 32;
}

function fahrenheitThreshold(unit, fahrenheitValue) {
	return unit === 'celsius' ? fahrenheitToCelsius(fahrenheitValue) : fahrenheitValue;
}

function getLegendSettings(unit) {
	if (unit === 'celsius') {
		return {
			min: -25,
			max: 45,
			swatchCount: 70,
			tickLabels: [-20, -10, 0, 10, 20, 30, 40],
			unitSuffix: 'C'
		};
	}
	return {
		min: LEGEND_MIN_TEMP,
		max: LEGEND_MAX_TEMP,
		swatchCount: LEGEND_SWATCH_COUNT,
		tickLabels: LEGEND_TICK_LABELS,
		unitSuffix: 'F'
	};
}

function temperatureUnitSuffix() {
	return gridRuntime.temperatureUnit === 'celsius' ? 'C' : 'F';
}

function getDisplayTemps(forecastData) {
	var raw = forecastData.hourly.temperature_2m.slice(0, HOURS_TO_SHOW);
	var sourceUnit = gridRuntime.lastForecastDataUnit || 'fahrenheit';

	if (sourceUnit === gridRuntime.temperatureUnit) {
		return raw;
	}
	if (sourceUnit === 'fahrenheit' && gridRuntime.temperatureUnit === 'celsius') {
		return raw.map(fahrenheitToCelsius);
	}
	return raw.map(celsiusToFahrenheit);
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
	var unit = gridRuntime.temperatureUnit;

	if (t < fahrenheitThreshold(unit, 130) && t >= fahrenheitThreshold(unit, 100)) {
		return scales.color4(t);
	}
	if (t < fahrenheitThreshold(unit, 100) && t >= fahrenheitThreshold(unit, 80)) {
		return scales.color3(t);
	}
	if (t < fahrenheitThreshold(unit, 80) && t >= fahrenheitThreshold(unit, 60)) {
		return scales.color2(t);
	}
	if (t < fahrenheitThreshold(unit, 60) && t >= fahrenheitThreshold(unit, 30)) {
		return scales.color1(t);
	}
	if (t < fahrenheitThreshold(unit, 30) && t >= fahrenheitThreshold(unit, -10)) {
		return scales.color0(t);
	}
	if (t < fahrenheitThreshold(unit, -10) && t >= fahrenheitThreshold(unit, -50)) {
		return scales.colorc(t);
	}
	return d3.rgb(0, 0, 0);
}

function createColorScales(unit) {
	var resolvedUnit = unit === 'celsius' ? 'celsius' : 'fahrenheit';

	if (resolvedUnit === 'celsius') {
		return {
			colorc: d3.scale.linear().domain([fahrenheitToCelsius(-50), fahrenheitToCelsius(-10)]).range([d3.rgb(0, 0, 0), d3.rgb(128, 0, 128)]),
			color0: d3.scale.linear().domain([fahrenheitToCelsius(-10), fahrenheitToCelsius(30)]).range([d3.rgb(128, 0, 128), d3.rgb(0, 0, 255)]),
			color1: d3.scale.linear().domain([fahrenheitToCelsius(30), fahrenheitToCelsius(60)]).range([d3.rgb(0, 0, 255), d3.rgb(185, 248, 255)]),
			color2: d3.scale.linear().domain([fahrenheitToCelsius(60), fahrenheitToCelsius(80)]).range([d3.rgb(185, 248, 255), d3.rgb(255, 140, 54)]),
			color3: d3.scale.linear().domain([fahrenheitToCelsius(80), fahrenheitToCelsius(100)]).range([d3.rgb(255, 140, 54), d3.rgb(255, 0, 0)]),
			color4: d3.scale.linear().domain([fahrenheitToCelsius(100), fahrenheitToCelsius(130)]).range([d3.rgb(255, 0, 0), d3.rgb(0, 0, 0)])
		};
	}

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

function legendTempToFraction(temp, legend) {
	return (temp - legend.min) / (legend.max - legend.min);
}

function legendTickX(temp, gridLeft, gridWidth, legend) {
	return gridLeft + legendTempToFraction(temp, legend) * gridWidth;
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

function cellIndexFontSize(blockSize) {
	return Math.max(8, Math.min(12, blockSize * 0.24));
}

function percentOverlayCellFontSize(blockSize, label) {
	var cellInner = Math.max(blockSize - 2, 8);
	var charWidthRatio = 0.55;
	var horizontalPadding = 4;
	var maxByWidth = Math.floor((cellInner - horizontalPadding) / (label.length * charWidthRatio));
	var scale = label.length >= 4 ? 0.30 : 0.38;
	var preferred = Math.round(blockSize * scale);
	var maxCap = label.length >= 4 ? 14 : 20;
	return Math.max(7, Math.min(maxByWidth, preferred, maxCap));
}

function cellValueFontSize(blockSize, cellValue) {
	if (isPercentOverlayGridMode()) {
		var value = cellValue != null && !isNaN(cellValue) ? cellValue : 0;
		return percentOverlayCellFontSize(blockSize, formatPercentCellValue(value));
	}
	return cellIndexFontSize(blockSize);
}

function cellLabelInset(blockSize) {
	return Math.max(3, Math.round(blockSize * 0.1));
}

function cellValueLabelAttrs(layout, viewportWidth, hourIndex, cellRect, cellValue) {
	var fontSize = cellValueFontSize(layout.blockSize, cellValue);

	if (isPercentOverlayGridMode() && !usesCompactIconCellLayout()) {
		return {
			fontSize: fontSize,
			textAnchor: "middle",
			x: cellRect.x + cellRect.width / 2,
			y: cellRect.y + cellRect.height / 2,
			dy: "0.35em"
		};
	}

	var inset = cellLabelInset(layout.blockSize);
	return {
		fontSize: fontSize,
		textAnchor: "end",
		x: cellRect.x + cellRect.width - inset,
		y: cellRect.y + cellRect.height - inset,
		dy: null
	};
}

function staticCellRect(hourIndex, layout, viewportWidth) {
	var cellInner = layout.blockSize - 2;
	return {
		x: gridX(hourIndex, layout.blockSize, viewportWidth),
		y: gridY(hourIndex, layout.blockSize),
		width: cellInner,
		height: cellInner
	};
}

function formatCellTemperature(temp) {
	return Math.round(temp) + '\u00B0' + temperatureUnitSuffix();
}

function formatTemperatureTooltip(temp) {
	return Math.round(temp) + ' degrees ' + temperatureUnitSuffix() + '.';
}

function describeWeatherCode(weatherCode) {
	if (weatherCodeDescriptions.hasOwnProperty(weatherCode)) {
		return weatherCodeDescriptions[weatherCode];
	}
	return 'Unknown conditions';
}

function formatPrecipitationTooltip(probability, weatherCode) {
	var lines = [Math.round(probability) + '% chance of precipitation.'];
	if (weatherCode != null && !isNaN(weatherCode)) {
		lines.push(describeWeatherCode(weatherCode) + '.');
	}
	return lines.join('<br />');
}

function formatCloudCoverTooltip(cloudCover) {
	return Math.round(cloudCover) + '% cloud cover.';
}

function formatPercentCellValue(value) {
	return Math.round(value) + '%';
}

function formatCellValue(value) {
	if (isPercentOverlayGridMode()) {
		return formatPercentCellValue(value);
	}
	return formatCellTemperature(value);
}

function formatCellTooltip(value, weatherCode) {
	if (isPrecipitationGridMode()) {
		return formatPrecipitationTooltip(value, weatherCode);
	}
	if (isCloudCoverGridMode()) {
		return formatCloudCoverTooltip(value);
	}
	return formatTemperatureTooltip(value);
}

function buildGridCellTooltipHtml(date, cellValue, weatherCode) {
	return weekDays[date.getDay()] + ", " + monthNames[date.getMonth()] + " " + date.getDate() + ", " + formatAMPM(date)
		+ "<br />" + formatCellTooltip(cellValue, weatherCode);
}

function buildGridIconCellHtml(weatherCode) {
	var iconMarkup = gridIconHtml(weatherCode);
	if (usesCompactIconCellLayout()) {
		return '<div class="grid-icon-corner">' + iconMarkup + '</div>';
	}
	return iconMarkup;
}

function gridIconCellClassName() {
	return usesCompactIconCellLayout()
		? 'grid-icon-cell grid-icon-cell--compact'
		: 'grid-icon-cell';
}

function cellValueTextAnchor() {
	if (isPercentOverlayGridMode() && !usesCompactIconCellLayout()) {
		return 'middle';
	}
	return 'end';
}

function applyGridOverlayTextStyle(selection) {
	selection
		.attr("font-family", "sans-serif")
		.attr("font-weight", "bold")
		.attr("pointer-events", "none")
		.attr("paint-order", "stroke")
		.attr("stroke-width", 2);
}

function styleCellValueLabel(selection, cellValues) {
	selection
		.attr("fill", function (hourIndex) {
			if (isTemperatureGridMode()) {
				return "#ffffff";
			}
			return cellValues[hourIndex] < 50 ? "#1a2a44" : "#ffffff";
		})
		.attr("stroke", function (hourIndex) {
			if (isTemperatureGridMode()) {
				return "#000000";
			}
			return cellValues[hourIndex] < 50 ? "#ffffff" : "#000000";
		});
}

function getCellIntroPosition(hourIndex, layout, viewportWidth, hProgress, vProgress) {
	var originX = gridX(0, layout.blockSize, viewportWidth);
	var originY = gridY(0, layout.blockSize);
	var targetX = gridX(hourIndex, layout.blockSize, viewportWidth);
	var targetY = gridY(hourIndex, layout.blockSize);
	var size = cellSize(layout.blockSize);

	if (vProgress <= 0) {
		var hEased = easeInOutCubic(hProgress);
		return {
			x: originX + (targetX - originX) * hEased,
			y: originY,
			width: size,
			height: size
		};
	}

	var vEased = easeInOutCubic(vProgress);
	return {
		x: targetX,
		y: originY + (targetY - originY) * vEased,
		width: size,
		height: size
	};
}

function applyIntroFrame(animatedLayer, layout, viewportWidth, hProgress, vProgress, cellValues) {
	gridRuntime.introProgress.h = hProgress;
	gridRuntime.introProgress.v = vProgress;

	animatedLayer.selectAll("rect.grid-cell")
		.attr("x", function () {
			var hourIndex = getHourIndex(this);
			return getCellIntroPosition(hourIndex, layout, viewportWidth, hProgress, vProgress).x;
		})
		.attr("y", function () {
			var hourIndex = getHourIndex(this);
			return getCellIntroPosition(hourIndex, layout, viewportWidth, hProgress, vProgress).y;
		})
		.attr("width", function () {
			var hourIndex = getHourIndex(this);
			return getCellIntroPosition(hourIndex, layout, viewportWidth, hProgress, vProgress).width;
		})
		.attr("height", function () {
			var hourIndex = getHourIndex(this);
			return getCellIntroPosition(hourIndex, layout, viewportWidth, hProgress, vProgress).height;
		});

	if (gridRuntime.showCellIndices) {
		var labelFontSize = cellIndexFontSize(layout.blockSize);
		animatedLayer.selectAll("text.grid-cell-index")
			.attr("font-size", labelFontSize + "px")
			.attr("x", function (d) {
				var pos = getCellIntroPosition(d, layout, viewportWidth, hProgress, vProgress);
				return pos.x + pos.width / 2;
			})
			.attr("y", function (d) {
				var pos = getCellIntroPosition(d, layout, viewportWidth, hProgress, vProgress);
				return pos.y + pos.height / 2;
			});
	}

	if (shouldShowCellValues()) {
		animatedLayer.selectAll("text.grid-cell-value")
			.each(function (hourIndex) {
				var pos = getCellIntroPosition(hourIndex, layout, viewportWidth, hProgress, vProgress);
				var attrs = cellValueLabelAttrs(
					layout,
					viewportWidth,
					hourIndex,
					pos,
					cellValues ? cellValues[hourIndex] : 0
				);
				var label = d3.select(this);
				label
					.attr("font-size", attrs.fontSize + "px")
					.attr("text-anchor", attrs.textAnchor)
					.attr("x", attrs.x)
					.attr("y", attrs.y);
				if (attrs.dy) {
					label.attr("dy", attrs.dy);
				} else {
					label.attr("dy", null);
				}
			});
	}

	applyCurrentHourMarker(animatedLayer, layout, viewportWidth, gridRuntime.currentHourIndex, hProgress, vProgress);
}

function applyCurrentHourMarker(animatedLayer, layout, viewportWidth, currentHourIndex, hProgress, vProgress) {
	var marker = animatedLayer.selectAll("rect.grid-cell-current");

	if (currentHourIndex < 0) {
		marker.attr("visibility", "hidden");
		return;
	}

	var pos = getCellIntroPosition(currentHourIndex, layout, viewportWidth, hProgress, vProgress);
	var outlinePad = 2;

	marker
		.attr("visibility", "visible")
		.attr("x", pos.x - outlinePad)
		.attr("y", pos.y - outlinePad)
		.attr("width", pos.width + outlinePad * 2)
		.attr("height", pos.height + outlinePad * 2);
}

function applyCellIndexLayout(animatedLayer, layout, viewportWidth) {
	if (!gridRuntime.showCellIndices) {
		return;
	}

	var labelFontSize = cellIndexFontSize(layout.blockSize);
	var cellInner = layout.blockSize - 2;
	animatedLayer.selectAll("text.grid-cell-index")
		.attr("font-size", labelFontSize + "px")
		.attr("x", function (d) {
			return gridX(d, layout.blockSize, viewportWidth) + cellInner / 2;
		})
		.attr("y", function (d) {
			return gridY(d, layout.blockSize) + cellInner / 2;
		});
}

function applyCellValueLayout(animatedLayer, layout, viewportWidth, cellValues) {
	if (!shouldShowCellValues()) {
		return;
	}

	var valueLabels = animatedLayer.selectAll("text.grid-cell-value");

	valueLabels.each(function (hourIndex) {
		var attrs = cellValueLabelAttrs(
			layout,
			viewportWidth,
			hourIndex,
			staticCellRect(hourIndex, layout, viewportWidth),
			cellValues[hourIndex]
		);
		var label = d3.select(this);
		label
			.attr("font-size", attrs.fontSize + "px")
			.attr("text-anchor", attrs.textAnchor)
			.attr("x", attrs.x)
			.attr("y", attrs.y);
		if (attrs.dy) {
			label.attr("dy", attrs.dy);
		} else {
			label.attr("dy", null);
		}
	});

	valueLabels.text(function (hourIndex) {
		return formatCellValue(cellValues[hourIndex]);
	});

	styleCellValueLabel(valueLabels, cellValues);
}

function raiseCellIndexLabelsOnTop(animatedLayer) {
	if (!gridRuntime.showCellIndices) {
		return;
	}

	var layerNode = animatedLayer.node();
	if (!layerNode) {
		return;
	}

	animatedLayer.selectAll("text.grid-cell-index").each(function () {
		layerNode.appendChild(this);
	});
}

function raiseCellValueLabelsOnTop(animatedLayer) {
	if (!shouldShowCellValues()) {
		return;
	}

	var layerNode = animatedLayer.node();
	if (!layerNode) {
		return;
	}

	animatedLayer.selectAll("text.grid-cell-value").each(function () {
		layerNode.appendChild(this);
	});
}

function raiseGridOverlayLabelsOnTop(animatedLayer) {
	raiseCellIndexLabelsOnTop(animatedLayer);
	raiseCellValueLabelsOnTop(animatedLayer);
}

function raiseGridIconsOnTop(animatedLayer) {
	var layerNode = animatedLayer.node();
	if (!layerNode) {
		return;
	}

	animatedLayer.selectAll("foreignObject.grid-icon").each(function () {
		layerNode.appendChild(this);
	});
}

function setAllGridCellOpacity(animatedLayer, opacity) {
	animatedLayer.selectAll("rect.grid-cell, text.grid-cell-index").attr("opacity", opacity);
}

function hourDataKey(d, i) {
	return i;
}

function hourIndexDataKey(hourIndex) {
	return hourIndex;
}

function hourIndicesDescending(count) {
	var indices = [];
	for (var h = count - 1; h >= 0; h--) {
		indices.push(h);
	}
	return indices;
}

function findCurrentHourIndex(hourTimes) {
	var now = Date.now();
	var i;

	for (i = 0; i < hourTimes.length; i++) {
		var hourStart = hourTimes[i].getTime();
		var hourEnd = i + 1 < hourTimes.length
			? hourTimes[i + 1].getTime()
			: hourStart + 3600000;
		if (now >= hourStart && now < hourEnd) {
			return i;
		}
	}

	for (i = hourTimes.length - 1; i >= 0; i--) {
		if (hourTimes[i].getTime() <= now) {
			return i;
		}
	}

	return -1;
}

function getHourIndex(cellNode) {
	return parseInt(cellNode.getAttribute("data-hour-index"), 10);
}

function getIntroCellIndex(node) {
	if (node.tagName === "text") {
		var labelIndex = parseInt(node.textContent, 10);
		if (!isNaN(labelIndex)) {
			return labelIndex;
		}
	}
	return getHourIndex(node);
}

function setGridCellIntroOpacity(animatedLayer, firstCellOpacity, otherCellsOpacity) {
	animatedLayer.selectAll("rect.grid-cell")
		.attr("opacity", function () {
			return getHourIndex(this) === 0 ? firstCellOpacity : otherCellsOpacity;
		})
		.attr("visibility", function () {
			return getHourIndex(this) === 0 || otherCellsOpacity > 0 ? "visible" : "hidden";
		});

	if (!gridRuntime.showCellIndices) {
		return;
	}

	animatedLayer.selectAll("text.grid-cell-index")
		.attr("opacity", function () {
			var hourIndex = getIntroCellIndex(this);
			return hourIndex === 0 ? firstCellOpacity : otherCellsOpacity;
		})
		.attr("visibility", function () {
			var hourIndex = getIntroCellIndex(this);
			return hourIndex === 0 || otherCellsOpacity > 0 ? "visible" : "hidden";
		});
}

function setGridChromeOpacity(animatedLayer, opacity) {
	animatedLayer.selectAll("text.day-row-label, rect.legend-swatch, text.legend-label, foreignObject.grid-icon, rect.grid-cell-current, text.grid-cell-value")
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
		setGridChromeOpacity(animatedLayer, 1);
	}

	gridRuntime.introFrame = window.requestAnimationFrame(runFadeFrame);
}

function cancelGridIntro() {
	if (gridRuntime.introFrame) {
		window.cancelAnimationFrame(gridRuntime.introFrame);
		gridRuntime.introFrame = 0;
	}
}

function animateGridIntro(animatedLayer, layout, viewportWidth, cellValues, onComplete) {
	cancelGridIntro();
	gridRuntime.introComplete = false;
	gridRuntime.introProgress = { h: 0, v: 0 };
	setGridChromeOpacity(animatedLayer, 0);
	setGridCellIntroOpacity(animatedLayer, 0, 0);
	applyIntroFrame(animatedLayer, layout, viewportWidth, 0, 0, cellValues);

	var phase = "fadeIn";
	var phaseStart = null;

	function runFrame(timestamp) {
		if (!phaseStart) {
			phaseStart = timestamp;
		}

		var elapsed = timestamp - phaseStart;

		if (phase === "fadeIn") {
			var fadeProgress = Math.min(elapsed / GRID_INTRO_CELL_FADE_MS, 1);
			applyIntroFrame(animatedLayer, layout, viewportWidth, 0, 0, cellValues);
			setGridCellIntroOpacity(animatedLayer, fadeProgress, 0);
			if (fadeProgress < 1) {
				gridRuntime.introFrame = window.requestAnimationFrame(runFrame);
				return;
			}
			phase = "pause";
			phaseStart = null;
			gridRuntime.introFrame = window.requestAnimationFrame(runFrame);
			return;
		}

		if (phase === "pause") {
			applyIntroFrame(animatedLayer, layout, viewportWidth, 0, 0, cellValues);
			setGridCellIntroOpacity(animatedLayer, 1, 0);
			if (elapsed < GRID_INTRO_CELL_PAUSE_MS) {
				gridRuntime.introFrame = window.requestAnimationFrame(runFrame);
				return;
			}
			phase = "stackBehind";
			phaseStart = null;
			gridRuntime.introFrame = window.requestAnimationFrame(runFrame);
			return;
		}

		if (phase === "stackBehind") {
			applyIntroFrame(animatedLayer, layout, viewportWidth, 0, 0, cellValues);
			setAllGridCellOpacity(animatedLayer, 1);
			animatedLayer.selectAll("rect.grid-cell, text.grid-cell-index").attr("visibility", "visible");
			phase = "horizontal";
			phaseStart = null;
			gridRuntime.introFrame = window.requestAnimationFrame(runFrame);
			return;
		}

		var progress = Math.min(elapsed / GRID_INTRO_DURATION_MS, 1);

		if (phase === "horizontal") {
			applyIntroFrame(animatedLayer, layout, viewportWidth, progress, 0, cellValues);
			setAllGridCellOpacity(animatedLayer, 1);
			if (progress < 1) {
				gridRuntime.introFrame = window.requestAnimationFrame(runFrame);
				return;
			}
			phase = "vertical";
			phaseStart = null;
			gridRuntime.introFrame = window.requestAnimationFrame(runFrame);
			return;
		}

		applyIntroFrame(animatedLayer, layout, viewportWidth, 1, progress, cellValues);
		setAllGridCellOpacity(animatedLayer, 1);
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

function runGridIntro(animatedLayer, layout, viewportWidth, applyLayout, cellValues) {
	if (gridRuntime.skipNextIntro) {
		gridRuntime.skipNextIntro = false;
		gridRuntime.introComplete = true;
		gridRuntime.introProgress = { h: 1, v: 1 };
		applyLayout(false);
		setGridChromeOpacity(animatedLayer, 1);
		return;
	}

	var originX = gridX(0, layout.blockSize, viewportWidth);
	var originY = gridY(0, layout.blockSize);
	var originSize = cellSize(layout.blockSize);

	animatedLayer.selectAll("rect.grid-cell")
		.attr("x", originX)
		.attr("y", originY)
		.attr("width", originSize)
		.attr("height", originSize);
	setGridCellIntroOpacity(animatedLayer, 0, 0);
	setGridChromeOpacity(animatedLayer, 0);
	applyLayout(false, true);
	animateGridIntro(animatedLayer, layout, viewportWidth, cellValues, function () {
		applyLayout(false);
		raiseGridIconsOnTop(animatedLayer);
		raiseGridOverlayLabelsOnTop(animatedLayer);
		setGridChromeOpacity(animatedLayer, 0);
		fadeInGridChrome(animatedLayer);
	});
}

function replayGridIntro() {
	var active = gridRuntime.activeGrid;
	if (!active || !active.animatedLayer) {
		return;
	}
	runGridIntro(
		active.animatedLayer,
		active.layout,
		active.viewportWidth,
		active.applyLayout,
		active.cellValues
	);
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

function renderWeatherGrid(containerSelector, cellValues, hourTimes, weatherCodes, tooltip) {
	var numDays = cellValues.length / HOURS_PER_DAY;
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

	var legend = getLegendForGrid();
	var scales = createScalesForGrid();
	var hourOrder = hourIndicesDescending(cellValues.length);
	var currentHourIndex = findCurrentHourIndex(hourTimes);
	gridRuntime.currentHourIndex = currentHourIndex;

	var gridRects = animatedLayer.selectAll("rect.grid-cell")
		.data(hourOrder, hourIndexDataKey);

	gridRects.enter().append("svg:rect")
		.attr("class", "grid-cell")
		.attr("data-hour-index", function (hourIndex) { return hourIndex; })
		.attr("x", function (hourIndex) { return gridX(hourIndex, layout.blockSize, viewportWidth); })
		.attr("y", function (hourIndex) { return gridY(hourIndex, layout.blockSize); })
		.attr("width", layout.blockSize - 2)
		.attr("height", layout.blockSize - 2)
		.attr("fill", function (hourIndex) { return cellFill(cellValues, hourIndex, scales); });

	var currentHourMarker = animatedLayer.selectAll("rect.grid-cell-current")
		.data(currentHourIndex >= 0 ? [currentHourIndex] : [], hourIndexDataKey);

	currentHourMarker.enter().append("svg:rect")
		.attr("class", "grid-cell-current")
		.attr("pointer-events", "none")
		.attr("fill", "none")
		.attr("stroke", "#e8eef4")
		.attr("stroke-width", 3)
		.attr("rx", 2)
		.attr("ry", 2)
		.attr("opacity", 0);

	applyCurrentHourMarker(animatedLayer, layout, viewportWidth, currentHourIndex, 1, 1);
	setGridChromeOpacity(animatedLayer, 0);

	if (gridRuntime.showCellIndices) {
		var cellIndexLabels = animatedLayer.selectAll("text.grid-cell-index")
			.data(hourOrder, hourIndexDataKey);

		cellIndexLabels.enter().append("text")
			.attr("class", "grid-cell-index")
			.attr("data-hour-index", function (hourIndex) { return hourIndex; })
			.attr("text-anchor", "middle")
			.attr("fill", "#ffffff")
			.attr("stroke", "#000000")
			.attr("stroke-width", 2)
			.attr("paint-order", "stroke")
			.attr("font-family", "sans-serif")
			.attr("font-weight", "bold")
			.attr("pointer-events", "none")
			.attr("dy", "0.35em")
			.text(function (hourIndex) { return String(hourIndex); });

		applyCellIndexLayout(animatedLayer, layout, viewportWidth);
	}

	if (shouldShowCellValues()) {
		var cellValueLabels = animatedLayer.selectAll("text.grid-cell-value")
			.data(hourOrder, hourIndexDataKey);

		cellValueLabels.enter().append("text")
			.attr("class", "grid-cell-value")
			.attr("data-hour-index", function (hourIndex) { return hourIndex; })
			.attr("text-anchor", isPercentOverlayGridMode() ? "middle" : "end")
			.call(applyGridOverlayTextStyle);

		applyCellValueLayout(animatedLayer, layout, viewportWidth, cellValues);
	}

	if (shouldShowWeatherIcons()) {
		var gridIcons = animatedLayer.selectAll("foreignObject.grid-icon")
			.data(cellValues, hourDataKey);

		gridIcons.enter().append("foreignObject")
			.attr("class", "grid-icon")
			.attr("data-hour-index", function (d, i) { return i; })
			.attr("x", function (d, i) { return gridX(i, layout.blockSize, viewportWidth); })
			.attr("y", function (d, i) { return gridY(i, layout.blockSize); })
			.attr("width", cellSize(layout.blockSize))
			.attr("height", cellSize(layout.blockSize))
			.append("xhtml:div")
			.attr("class", gridIconCellClassName)
			.html(function (d, i) { return buildGridIconCellHtml(weatherCodes[i]); })
			.on("mouseover", function () {
				var index = getHourIndex(this.parentNode);
				var date = hourTimes[index];
				tooltip.transition().duration(200).style("opacity", 0.9);
				tooltip.html(buildGridCellTooltipHtml(date, cellValues[index], weatherCodes[index]))
					.style("left", d3.event.pageX + "px")
					.style("top", (d3.event.pageY - 28) + "px");
			})
			.on("mouseout", function () {
				tooltip.transition().duration(500).style("opacity", 0);
			});
	} else {
		animatedLayer.selectAll("rect.grid-cell")
			.on("mouseover", function () {
				var index = getHourIndex(this);
				var date = hourTimes[index];
				tooltip.transition().duration(200).style("opacity", 0.9);
				tooltip.html(buildGridCellTooltipHtml(date, cellValues[index], weatherCodes[index]))
					.style("left", d3.event.pageX + "px")
					.style("top", (d3.event.pageY - 28) + "px");
			})
			.on("mouseout", function () {
				tooltip.transition().duration(500).style("opacity", 0);
			});
	}

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
	for (var j = legend.min; j < legend.max; j++) {
		legendTemps.push(j);
	}

	var legendSwatchWidth = layout.gridWidth / legend.swatchCount;

	var legendSwatches = animatedLayer.selectAll("rect.legend-swatch")
		.data(legendTemps);

	legendSwatches.enter().append("svg:rect")
		.attr("class", "legend-swatch")
		.attr("x", function (d, i) { return layout.gridLeft + (i * legendSwatchWidth); })
		.attr("y", layout.legendBarY)
		.attr("width", legendSwatchWidth + 0.5)
		.attr("height", layout.legendBarHeight)
		.attr("fill", function (d, i) { return cellFill(legendTemps, i, scales); });
	legendSwatches = animatedLayer.selectAll("rect.legend-swatch");

	var legendTicks = animatedLayer.selectAll("text.legend-label")
		.data(legend.tickLabels);

	legendTicks.enter().append("text")
		.attr("class", "legend-label")
		.text(function (d) { return d + ' ' + legend.unitSuffix; })
		.attr("x", function (d) { return legendTickX(d, layout.gridLeft, layout.gridWidth, legend); })
		.attr("y", layout.legendLabelY)
		.attr("text-anchor", function (d, i) { return legendTickAnchor(i, legend.tickLabels.length); })
		.attr("fill", "#e8eef4")
		.attr("stroke", "#1a1a1a")
		.attr("stroke-width", 3)
		.attr("paint-order", "stroke")
		.attr("font-family", "sans-serif")
		.attr("font-size", "12px");
	legendTicks = animatedLayer.selectAll("text.legend-label");
	raiseGridIconsOnTop(animatedLayer);
	raiseGridOverlayLabelsOnTop(animatedLayer);

	function applyLayout(refreshDayText, skipCells) {
		// D3 v2 enter() selections do not include appended nodes; always re-query live nodes.
		svg
			.attr("width", viewportWidth)
			.attr("height", layout.contentHeight + margins[0] + margins[2]);

		if (skipCells) {
			return;
		}

		animatedLayer.selectAll("rect.grid-cell")
			.attr("x", function () { return gridX(getHourIndex(this), layout.blockSize, viewportWidth); })
			.attr("y", function () { return gridY(getHourIndex(this), layout.blockSize); })
			.attr("width", layout.blockSize - 2)
			.attr("height", layout.blockSize - 2)
			.attr("opacity", 1)
			.attr("visibility", "visible");

		animatedLayer.selectAll("foreignObject.grid-icon")
			.attr("x", function () { return gridX(getHourIndex(this), layout.blockSize, viewportWidth); })
			.attr("y", function () { return gridY(getHourIndex(this), layout.blockSize); })
			.attr("width", cellSize(layout.blockSize))
			.attr("height", cellSize(layout.blockSize));

		applyCellIndexLayout(animatedLayer, layout, viewportWidth);
		applyCellValueLayout(animatedLayer, layout, viewportWidth, cellValues);
		animatedLayer.selectAll("text.grid-cell-index, text.grid-cell-value")
			.attr("opacity", 1)
			.attr("visibility", "visible");
		applyCurrentHourMarker(animatedLayer, layout, viewportWidth, currentHourIndex, 1, 1);
		raiseGridIconsOnTop(animatedLayer);
		raiseGridOverlayLabelsOnTop(animatedLayer);

		legendSwatchWidth = layout.gridWidth / legend.swatchCount;

		animatedLayer.selectAll("rect.legend-swatch")
			.attr("x", function (d, i) { return layout.gridLeft + (i * legendSwatchWidth); })
			.attr("y", layout.legendBarY)
			.attr("width", legendSwatchWidth + 0.5)
			.attr("height", layout.legendBarHeight)
			.attr("fill", function (d, i) { return cellFill(legendTemps, i, scales); });

		animatedLayer.selectAll("text.legend-label")
			.attr("x", function (d) { return legendTickX(d, layout.gridLeft, layout.gridWidth, legend); })
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
					gridRuntime.introProgress.v,
					gridRuntime.activeGrid.cellValues
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
		applyLayout: applyLayout,
		cellValues: cellValues
	};
	runGridIntro(animatedLayer, layout, viewportWidth, applyLayout, cellValues);
}

function isLocalDevEnvironment() {
	var host = window.location.hostname;
	return !host
		|| host === 'localhost'
		|| host === '127.0.0.1'
		|| host === '[::1]';
}

function wireReplayIntroButton() {
	var btn = document.getElementById('replay-grid-intro');
	if (!btn) {
		return;
	}
	if (!isLocalDevEnvironment()) {
		btn.hidden = true;
		return;
	}
	if (btn.getAttribute('data-wired') === 'true') {
		return;
	}
	btn.setAttribute('data-wired', 'true');
	btn.addEventListener('click', replayGridIntro);
}

function loadStoredShowTemperatureInCells() {
	try {
		return localStorage.getItem(OPTIONS_STORAGE_KEY) === 'true';
	} catch (err) {
		return false;
	}
}

function saveShowTemperatureInCells(value) {
	try {
		localStorage.setItem(OPTIONS_STORAGE_KEY, value ? 'true' : 'false');
	} catch (err) {
		// ignore storage failures
	}
}

function loadStoredShowWeatherIconsInPrecip() {
	try {
		return localStorage.getItem(PRECIP_ICONS_STORAGE_KEY) === 'true';
	} catch (err) {
		return false;
	}
}

function saveShowWeatherIconsInPrecip(value) {
	try {
		localStorage.setItem(PRECIP_ICONS_STORAGE_KEY, value ? 'true' : 'false');
	} catch (err) {
		// ignore storage failures
	}
}

function loadStoredTemperatureUnit() {
	try {
		var unit = localStorage.getItem(TEMP_UNIT_STORAGE_KEY);
		return unit === 'celsius' ? 'celsius' : 'fahrenheit';
	} catch (err) {
		return 'fahrenheit';
	}
}

function saveTemperatureUnit(unit) {
	try {
		localStorage.setItem(TEMP_UNIT_STORAGE_KEY, unit === 'celsius' ? 'celsius' : 'fahrenheit');
	} catch (err) {
		// ignore storage failures
	}
}

function loadStoredGridMode() {
	try {
		return normalizeGridMode(localStorage.getItem(GRID_MODE_STORAGE_KEY));
	} catch (err) {
		return GRID_MODE_TEMPERATURE;
	}
}

function saveGridMode(mode) {
	try {
		localStorage.setItem(GRID_MODE_STORAGE_KEY, normalizeGridMode(mode));
	} catch (err) {
		// ignore storage failures
	}
}

function syncGridOptionsPanel() {
	var temperatureOnly = document.getElementById('grid-options-temperature-only');
	if (temperatureOnly) {
		temperatureOnly.hidden = gridRuntime.gridMode !== GRID_MODE_TEMPERATURE;
	}
	var precipitationOnly = document.getElementById('grid-options-precipitation-only');
	if (precipitationOnly) {
		precipitationOnly.hidden = gridRuntime.gridMode !== GRID_MODE_PRECIPITATION;
	}
}

function reloadGridFromLastForecast() {
	if (!gridRuntime.lastForecastData) {
		return;
	}
	gridRuntime.skipNextIntro = true;
	loadWeatherFromForecastData(gridRuntime.lastForecastData);
}

function reloadWeatherAfterOptionChange() {
	gridRuntime.skipNextIntro = true;
	if (gridRuntime.lastLocation && !gridRuntime.useMockData) {
		loadWeatherForLocation(gridRuntime.lastLocation);
		return;
	}
	reloadGridFromLastForecast();
}

function wireGridOptions() {
	var toggle = document.getElementById('grid-options-toggle');
	var panel = document.getElementById('grid-options-panel');
	var showTempsCheckbox = document.getElementById('grid-options-show-temps');
	var showPrecipIconsCheckbox = document.getElementById('grid-options-show-precip-icons');
	var unitInputs = document.querySelectorAll('input[name="grid-options-temp-unit"]');
	var modeInputs = document.querySelectorAll('input[name="grid-options-grid-mode"]');

	if (!toggle || !panel) {
		return;
	}

	if (toggle.getAttribute('data-wired') === 'true') {
		return;
	}
	toggle.setAttribute('data-wired', 'true');

	gridRuntime.showTemperatureInCells = loadStoredShowTemperatureInCells();
	gridRuntime.showWeatherIconsInPrecip = loadStoredShowWeatherIconsInPrecip();
	gridRuntime.temperatureUnit = loadStoredTemperatureUnit();
	gridRuntime.gridMode = loadStoredGridMode();
	if (showTempsCheckbox) {
		showTempsCheckbox.checked = gridRuntime.showTemperatureInCells;
	}
	if (showPrecipIconsCheckbox) {
		showPrecipIconsCheckbox.checked = gridRuntime.showWeatherIconsInPrecip;
	}

	for (var m = 0; m < modeInputs.length; m++) {
		modeInputs[m].checked = modeInputs[m].value === gridRuntime.gridMode;
	}

	for (var u = 0; u < unitInputs.length; u++) {
		unitInputs[u].checked = unitInputs[u].value === gridRuntime.temperatureUnit;
	}

	syncGridOptionsPanel();

	function setPanelOpen(isOpen) {
		panel.hidden = !isOpen;
		toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
	}

	setPanelOpen(false);

	toggle.addEventListener('click', function () {
		setPanelOpen(panel.hidden);
	});

	document.addEventListener('click', function (event) {
		if (!panel.hidden && !panel.contains(event.target) && !toggle.contains(event.target)) {
			setPanelOpen(false);
		}
	});

	if (showTempsCheckbox) {
		showTempsCheckbox.addEventListener('change', function () {
			gridRuntime.showTemperatureInCells = showTempsCheckbox.checked;
			saveShowTemperatureInCells(gridRuntime.showTemperatureInCells);
			reloadWeatherAfterOptionChange();
		});
	}

	if (showPrecipIconsCheckbox) {
		showPrecipIconsCheckbox.addEventListener('change', function () {
			gridRuntime.showWeatherIconsInPrecip = showPrecipIconsCheckbox.checked;
			saveShowWeatherIconsInPrecip(gridRuntime.showWeatherIconsInPrecip);
			reloadWeatherAfterOptionChange();
		});
	}

	for (var i = 0; i < unitInputs.length; i++) {
		unitInputs[i].addEventListener('change', function () {
			if (!this.checked) {
				return;
			}
			gridRuntime.temperatureUnit = this.value === 'celsius' ? 'celsius' : 'fahrenheit';
			saveTemperatureUnit(gridRuntime.temperatureUnit);
			reloadWeatherAfterOptionChange();
		});
	}

	for (var g = 0; g < modeInputs.length; g++) {
		modeInputs[g].addEventListener('change', function () {
			if (!this.checked) {
				return;
			}
			gridRuntime.gridMode = normalizeGridMode(this.value);
			saveGridMode(gridRuntime.gridMode);
			syncGridOptionsPanel();
			reloadWeatherAfterOptionChange();
		});
	}
}

function initWeatherGrid() {
	if (!gridRuntime.tooltip) {
		gridRuntime.tooltip = d3.select("body").append("div")
			.attr("class", "tooltip")
			.style("opacity", 0);
	}
	wireGridOptions();
	wireReplayIntroButton();
}

function renderWeatherFromForecastData(data) {
	var validationError = validateForecastData(data);
	if (validationError) {
		throw new Error(validationError);
	}
	gridRuntime.lastForecastData = data;
	var times = data.hourly.time.slice(0, HOURS_TO_SHOW);
	var cellValues = getCellValuesFromForecast(data);
	var weatherCodes = data.hourly.weathercode.slice(0, HOURS_TO_SHOW);
	var hourTimes = times.map(function (t) { return new Date(t); });

	renderWeatherGrid(GRID_CONTAINER, cellValues, hourTimes, weatherCodes, gridRuntime.tooltip);
}

function loadWeatherFromForecastData(data) {
	var loadId = ++gridRuntime.loadGeneration;

	clearGrid();

	return Promise.resolve(data).then(function (forecast) {
		if (loadId !== gridRuntime.loadGeneration) {
			return;
		}
		renderWeatherFromForecastData(forecast);
	});
}

function loadMockWeather() {
	if (!window.SAMPLE_FORECAST) {
		return Promise.reject(new Error('SAMPLE_FORECAST fixture is not loaded'));
	}
	gridRuntime.lastForecastDataUnit = 'fahrenheit';
	return loadWeatherFromForecastData(window.SAMPLE_FORECAST);
}

function fetchForecastForLocation(location, useMinimalHourly) {
	var coords = normalizeLocationCoords(location);
	return fetch(buildOpenMeteoUrl(coords.latitude, coords.longitude, useMinimalHourly))
		.then(function (response) {
			if (!response.ok) {
				var error = new Error('Open-Meteo request failed: ' + response.status);
				error.status = response.status;
				throw error;
			}
			return response.json();
		});
}

function loadWeatherForLocation(location) {
	var coords = normalizeLocationCoords(location);
	gridRuntime.lastLocation = coords;

	if (gridRuntime.useMockData) {
		return loadMockWeather();
	}

	var loadId = ++gridRuntime.loadGeneration;

	clearGrid();

	function finishLoad(data) {
		if (loadId !== gridRuntime.loadGeneration) {
			return;
		}
		gridRuntime.lastForecastDataUnit = gridRuntime.temperatureUnit;
		renderWeatherFromForecastData(data);
	}

	return fetchForecastForLocation(coords, false)
		.then(finishLoad)
		.catch(function (err) {
			if (loadId !== gridRuntime.loadGeneration) {
				throw err;
			}
			if (err && err.status === 400) {
				return fetchForecastForLocation(coords, true).then(finishLoad);
			}
			throw err;
		});
}

window.WeatherGrid = {
	init: initWeatherGrid,
	load: loadWeatherForLocation,
	loadMock: loadMockWeather,
	replayIntro: replayGridIntro,
	set useMockData(value) {
		gridRuntime.useMockData = !!value;
	},
	get useMockData() {
		return gridRuntime.useMockData;
	},
	set showCellIndices(value) {
		gridRuntime.showCellIndices = !!value;
	},
	get showCellIndices() {
		return gridRuntime.showCellIndices;
	},
	set showTemperatureInCells(value) {
		gridRuntime.showTemperatureInCells = !!value;
		saveShowTemperatureInCells(gridRuntime.showTemperatureInCells);
	},
	get showTemperatureInCells() {
		return gridRuntime.showTemperatureInCells;
	},
	set showWeatherIconsInPrecip(value) {
		gridRuntime.showWeatherIconsInPrecip = !!value;
		saveShowWeatherIconsInPrecip(gridRuntime.showWeatherIconsInPrecip);
	},
	get showWeatherIconsInPrecip() {
		return gridRuntime.showWeatherIconsInPrecip;
	},
	set gridMode(value) {
		gridRuntime.gridMode = normalizeGridMode(value);
		saveGridMode(gridRuntime.gridMode);
	},
	get gridMode() {
		return gridRuntime.gridMode;
	},
	set temperatureUnit(value) {
		gridRuntime.temperatureUnit = value === 'celsius' ? 'celsius' : 'fahrenheit';
		saveTemperatureUnit(gridRuntime.temperatureUnit);
	},
	get temperatureUnit() {
		return gridRuntime.temperatureUnit;
	}
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
