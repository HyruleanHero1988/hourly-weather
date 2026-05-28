(function () {
	'use strict';

	var MOCK_LOCATION = {
		latitude: 34.219753,
		longitude: -84.15171,
		label: 'Cumming, Georgia, United States (fixture)'
	};

	var searchInput;
	var suggestionsList;
	var geoButton;
	var locationDisplay;
	var statusEl;

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

	function reloadFixture() {
		setLocationDisplay(MOCK_LOCATION.label);
		setStatus('Reloading fixture...');
		return window.WeatherGrid.loadMock()
			.then(function () {
				setStatus('Fixture mode: no API calls.');
			})
			.catch(function (err) {
				setStatus('Could not load fixture data.');
				console.error(err);
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

		searchInput.addEventListener('input', hideSuggestions);
		searchInput.addEventListener('keydown', function (event) {
			if (event.key === 'Escape') {
				hideSuggestions();
				return;
			}
			if (event.key === 'Enter') {
				event.preventDefault();
				hideSuggestions();
				reloadFixture();
			}
		});

		if (geoButton) {
			geoButton.addEventListener('click', function () {
				hideSuggestions();
				reloadFixture();
			});
		}

		return true;
	}

	function init() {
		if (!bindUi()) {
			return;
		}

		window.WeatherGrid.useMockData = true;
		window.WeatherGrid.showCellIndices = true;
		window.WeatherGrid.init();
		reloadFixture();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
