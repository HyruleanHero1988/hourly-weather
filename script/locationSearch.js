(function () {
	'use strict';

	var GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
	var STORAGE_KEY = 'hourlyWeatherLocation';
	var DEBOUNCE_MS = 300;
	var MIN_SEARCH_LENGTH = 3;
	var DEFAULT_LOCATION = {
		latitude: 34.0754,
		longitude: -84.2941,
		label: 'Atlanta, Georgia, United States'
	};

	var searchInput;
	var suggestionsList;
	var geoButton;
	var locationDisplay;
	var statusEl;
	var debounceTimer;
	var activeFetchController;

	function parseUrlParams() {
		var params = {};
		var query = window.location.search.slice(1);
		if (!query) {
			return params;
		}
		query.split('&').forEach(function (part) {
			var pair = part.split('=');
			if (pair[0]) {
				params[pair[0]] = decodeURIComponent((pair[1] || '').replace(/\+/g, ' '));
			}
		});
		return params;
	}

	function formatLocationLabel(place) {
		var parts = [place.name];
		if (place.admin1) {
			parts.push(place.admin1);
		}
		if (place.country) {
			parts.push(place.country);
		}
		return parts.join(', ');
	}

	function locationFromPlace(place) {
		return {
			latitude: place.latitude,
			longitude: place.longitude,
			label: formatLocationLabel(place)
		};
	}

	function parseCoordinate(value) {
		var parsed = typeof value === 'number' ? value : parseFloat(value);
		return isFinite(parsed) ? parsed : null;
	}

	function normalizeLocation(location) {
		if (!location || typeof location !== 'object') {
			return null;
		}
		var lat = parseCoordinate(location.latitude);
		var lon = parseCoordinate(location.longitude);
		if (lat == null || lon == null || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
			return null;
		}
		return {
			latitude: lat,
			longitude: lon,
			label: location.label || (lat.toFixed(2) + ', ' + lon.toFixed(2))
		};
	}

	function isDefaultLocation(location) {
		return location
			&& location.latitude === DEFAULT_LOCATION.latitude
			&& location.longitude === DEFAULT_LOCATION.longitude;
	}

	function clearSavedLocation() {
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch (err) {
			// ignore storage failures
		}
	}

	function saveLocation(location) {
		var normalized = normalizeLocation(location);
		if (!normalized) {
			return;
		}
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
		} catch (err) {
			// ignore quota / private mode errors
		}
	}

	function loadSavedLocation() {
		try {
			var raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) {
				return null;
			}
			return JSON.parse(raw);
		} catch (err) {
			return null;
		}
	}

	function updateUrl(location) {
		var url = new URL(window.location.href);
		url.searchParams.set('lat', String(location.latitude));
		url.searchParams.set('lon', String(location.longitude));
		if (location.label) {
			url.searchParams.set('location', location.label);
		}
		window.history.replaceState({}, '', url.toString());
	}

	function setStatus(message) {
		if (statusEl) {
			statusEl.textContent = message || '';
		}
	}

	function setLocationDisplay(label) {
		if (locationDisplay) {
			locationDisplay.textContent = label ? 'Forecast for ' + label : '';
		}
		if (searchInput && label) {
			searchInput.value = label;
		}
	}

	function hideSuggestions() {
		if (suggestionsList) {
			suggestionsList.hidden = true;
			suggestionsList.innerHTML = '';
		}
	}

	function showSuggestions(results, onSelect) {
		suggestionsList.innerHTML = '';
		if (!results.length) {
			suggestionsList.hidden = true;
			return;
		}

		results.forEach(function (place) {
			var item = document.createElement('li');
			var button = document.createElement('button');
			button.type = 'button';
			button.textContent = formatLocationLabel(place);
			button.addEventListener('click', function () {
				hideSuggestions();
				onSelect(locationFromPlace(place));
			});
			item.appendChild(button);
			suggestionsList.appendChild(item);
		});

		suggestionsList.hidden = false;
	}

	function searchLocations(query) {
		if (activeFetchController) {
			activeFetchController.abort();
		}
		activeFetchController = new AbortController();

		var url = GEOCODING_URL + '?name=' + encodeURIComponent(query)
			+ '&count=8&language=en&format=json';

		return fetch(url, { signal: activeFetchController.signal })
			.then(function (response) {
				if (!response.ok) {
					throw new Error('Location search failed');
				}
				return response.json();
			})
			.then(function (data) {
				return data.results || [];
			});
	}

	function applyLocation(location, options) {
		options = options || {};
		var normalized = normalizeLocation(location);
		if (!normalized) {
			if (options.isRetry) {
				setStatus('Could not load weather for this location.');
				return Promise.resolve();
			}
			clearSavedLocation();
			return applyLocation(DEFAULT_LOCATION, {
				updateUrl: options.updateUrl,
				isRetry: true
			});
		}

		saveLocation(normalized);
		if (options.updateUrl !== false) {
			updateUrl(normalized);
		}
		setLocationDisplay(normalized.label);
		setStatus('Loading forecast...');
		return window.WeatherGrid.load(normalized)
			.then(function () {
				setStatus('');
			})
			.catch(function (err) {
				console.error(err);
				if (!options.isRetry && !isDefaultLocation(normalized)) {
					clearSavedLocation();
					setStatus('Saved location failed. Loading default forecast...');
					return applyLocation(DEFAULT_LOCATION, {
						updateUrl: options.updateUrl,
						isRetry: true
					});
				}
				setStatus('Could not load weather for this location.');
			});
	}

	function requestBrowserLocation() {
		if (!navigator.geolocation) {
			setStatus('Geolocation is not supported in this browser.');
			return Promise.reject(new Error('unsupported'));
		}

		setStatus('Getting your location...');

		return new Promise(function (resolve, reject) {
			navigator.geolocation.getCurrentPosition(
				function (position) {
					resolve({
						latitude: position.coords.latitude,
						longitude: position.coords.longitude,
						label: 'Your location'
					});
				},
				function (err) {
					reject(err);
				},
				{ enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
			);
		});
	}

	function resolveInitialLocation() {
		var params = parseUrlParams();

		if (params.lat && params.lon) {
			var urlLocation = normalizeLocation({
				latitude: params.lat,
				longitude: params.lon,
				label: params.location || params.q
			});
			if (urlLocation) {
				return Promise.resolve(urlLocation);
			}
		}

		if (params.location || params.q) {
			var query = params.location || params.q;
			return searchLocations(query).then(function (results) {
				if (results.length) {
					return locationFromPlace(results[0]);
				}
				throw new Error('No location found for URL');
			});
		}

		// Legacy ?city= & ?state= — geocode combined string
		if (params.city) {
			var legacyQuery = params.city + (params.state ? ', ' + params.state : '');
			return searchLocations(legacyQuery).then(function (results) {
				if (results.length) {
					return locationFromPlace(results[0]);
				}
				throw new Error('No location found');
			});
		}

		return requestBrowserLocation()
			.then(function (browserLocation) {
				return normalizeLocation(browserLocation) || DEFAULT_LOCATION;
			})
			.catch(function () {
				var saved = loadSavedLocation();
				return normalizeLocation(saved) || DEFAULT_LOCATION;
			});
	}

	function onSearchInput() {
		var query = searchInput.value.trim();
		clearTimeout(debounceTimer);

		if (query.length < MIN_SEARCH_LENGTH) {
			hideSuggestions();
			return;
		}

		debounceTimer = setTimeout(function () {
			searchLocations(query)
				.then(function (results) {
					showSuggestions(results, applyLocation);
				})
				.catch(function (err) {
					if (err.name !== 'AbortError') {
						console.error(err);
					}
				});
		}, DEBOUNCE_MS);
	}

	function onSearchKeydown(event) {
		if (event.key === 'Escape') {
			hideSuggestions();
			return;
		}
		if (event.key !== 'Enter') {
			return;
		}
		event.preventDefault();
		var query = searchInput.value.trim();
		if (!query) {
			return;
		}
		hideSuggestions();
		setStatus('Searching...');
		searchLocations(query)
			.then(function (results) {
				if (!results.length) {
					setStatus('No locations found. Try a different search.');
					return;
				}
				applyLocation(locationFromPlace(results[0]));
			})
			.catch(function () {
				setStatus('Location search failed. Please try again.');
			});
	}

	function onUseGeolocation() {
		requestBrowserLocation()
			.then(function (location) {
				applyLocation(location);
			})
			.catch(function (err) {
				if (err.code === 1) {
					setStatus('Location access denied. Search for a city or zip code instead.');
				} else {
					setStatus('Could not determine your location.');
				}
			});
	}

	function bindUi() {
		searchInput = document.getElementById('location-input');
		suggestionsList = document.getElementById('location-suggestions');
		geoButton = document.getElementById('location-use-geolocation');
		locationDisplay = document.getElementById('location-display');
		statusEl = document.getElementById('weather-status');

		if (!searchInput) {
			return false;
		}

		searchInput.addEventListener('input', onSearchInput);
		searchInput.addEventListener('keydown', onSearchKeydown);

		document.addEventListener('click', function (event) {
			if (!event.target.closest('.location-search')) {
				hideSuggestions();
			}
		});

		if (geoButton) {
			geoButton.addEventListener('click', onUseGeolocation);
		}

		return true;
	}

	function init() {
		if (!bindUi()) {
			return;
		}

		window.WeatherGrid.init();
		setStatus('Loading forecast...');

		resolveInitialLocation()
			.then(function (location) {
				return applyLocation(location, { updateUrl: false });
			})
			.catch(function () {
				return applyLocation(DEFAULT_LOCATION, { updateUrl: false });
			});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
