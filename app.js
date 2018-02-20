function initMap () {

	//BUTTONS AND INPUTS
	let $searchInputBox = $("#search")[0];
	let $searchBtn = $("#searchBtn");
	let $userLocBtn = $("#userData");
	let $nearbyBtn = $("#nearby");
	let $userSearchTerm = $("#search");
	let $mapDisplay = $("#map")[0];
	let $locationDisplay = $("#location");
	let $addressDisplay = $("#address");
	let $timeDisplay = $("#currentTime");
	let $altitudeDisplay = $("#altitude");
	let $temperatureDisplay = $("#temperature");
	let $weatherDisplay = $("#weather");
	let $sunriseDisplay = $("#sunrise");
	let $sunsetDisplay = $("#sunset");
	let aboveSeaLevel;
	let infowindow;
	let map;
	let mapOptions;
	let position;
	let stringAddress;
	let searchedAddress;
	let readableAddress;
	let googleQueryString = 'https://www.google.com/search?';
	let weatherCallEndpoint = 'https://cors-anywhere.herokuapp.com/http://api.openweathermap.org/data/2.5/weather?APPID=59d575c3f00dca798f0ce5625ddacdd2';
	let geocodeURL = {
		endpoint: 'https://maps.googleapis.com/maps/api/geocode/json',
		key: 'AIzaSyCUFrszLIicDJYMgsRwnm-16kowoyFLK4E'
	};
	let timeURL = {
		endpoint: 'https://maps.googleapis.com/maps/api/timezone/json',
		key: 'AIzaSyCRsHoFoLH1JZvNPrgkC-_ZGpIknc5_OKM'
	}

	//EVENT LISTENERS
	$searchBtn.on("click", handleSearch);
	$nearbyBtn.on("click", getNearbyPoints);
	$userLocBtn.on("click", getUserLocation);

	let autocomplete = new google.maps.places.Autocomplete($searchInputBox);

	//handleSearch should capture user input, encode it, then getMap of that place
	function handleSearch(event) {
		event.preventDefault();
		let userAddress = $userSearchTerm.val();
		//encode it right here, then pass it to getMaps
		let encodedAddress = encodeURI(userAddress);
		getMaps(encodedAddress);
	}

	function getUserLocation(event) {
		event.preventDefault();
		if(navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(function (position) {
				stringAddress = `${position.coords.latitude},${position.coords.longitude}`;
				getMaps(stringAddress);
			});
		} else {
			$locationDisplay.html("Sorry, geolocation is not supported by your browser");
		}
	}

	function getMaps(address) {
		$.getJSON(`${geocodeURL.endpoint}?address=${address}&key=${geocodeURL.key}`, function(json) {
			if(json.status === "ZERO_RESULTS") {
				$locationDisplay.html("Please enter a new address");
				return;
			}	
			searchedAddress = json.results[0].geometry.location;
			readableAddress = json.results[0].formatted_address;
			updateMap(searchedAddress, readableAddress);
			$userSearchTerm.val('');			
		});
	}

	function updateMap(location, readableAddress) {
		// $weatherDisplay.html('');
		let altitude = new google.maps.ElevationService;
		altitude.getElevationForLocations({
			'locations': [location]
		}, function(results) {
			if(results[0]) {
				aboveSeaLevel = Math.round(results[0].elevation*3.28084);
				$addressDisplay.val(`${readableAddress}`);
				$altitudeDisplay.val(`${aboveSeaLevel} feet above sea level`);
			}
		});

		getWeather(location);
		makeMap(location, readableAddress);
		
		let autocomplete = new google.maps.places.Autocomplete($searchInputBox);
	}

	function getWeather(place) {
		$.getJSON(`${weatherCallEndpoint}&lat=${place.lat}&lon=${place.lng}&units=imperial`, function(json) {
			let localTemp = Math.round(json.main.temp);
			let weatherType = json.weather[0].description;
			//puts timestamp in msecs into Date
			let sunRiseStamp = json.sys.sunrise *1000;
			let sunSetStamp = json.sys.sunset *1000; 
			getRiseTime(place, sunRiseStamp);
			getSetTime(place, sunSetStamp);
			getLocalTime(place);
			$weatherDisplay.val(weatherType);
			$temperatureDisplay.val(`${localTemp}°`);
			$locationDisplay.css('display', 'block');
		});
	}

	function fixMinutes(time) {
		if(time < 10) {
			
			time= "0".concat(time);
		}
			return time;
	}

	function fixHour(time) {
		if(time == 0 || time == 12) {
			time = 12;
		} else {
			time = time%12;
		}
		return time;
	}

	function amPm(time) {
		if(time.getHours() >= 12) {
			return " p.m.";
		} else {
			return " a.m.";
		}
	}

	function getLocalTime(place) {
		let currentLocalTime = new Date();
		let realTimestamp = currentLocalTime.getTime()/1000 + currentLocalTime.getTimezoneOffset()*60;
		$.getJSON(`${timeURL.endpoint}?location=${place.lat},${place.lng}&timestamp=${realTimestamp}&key=${timeURL.key}`, function(json) {
			let offsets = json.dstOffset * 1000 + json.rawOffset * 1000;
			let localTime = new Date(realTimestamp*1000 + offsets);
			let realTime = fixHour(localTime.getHours()) + ":" + fixMinutes(localTime.getMinutes()) + amPm(localTime);
			$timeDisplay.val(realTime);
		});
	}
	
	function getRiseTime(place, riseTimestamp) {
		let userSunRiseDateString = new Date(riseTimestamp);
		let realTimestamp = userSunRiseDateString.getTime()/1000 + userSunRiseDateString.getTimezoneOffset()*60;
		$.getJSON(`${timeURL.endpoint}?location=${place.lat},${place.lng}&timestamp=${realTimestamp}&key=${timeURL.key}`, function(json) {
			let offsets = json.dstOffset * 1000 + json.rawOffset * 1000;
			let realDateString = new Date(realTimestamp*1000 + offsets);
			let realRise = realDateString.getHours()%12 + ":" + fixMinutes(realDateString.getMinutes());
			$sunriseDisplay.val(`${realRise} a.m.`);
		});
	}

	function getSetTime(place, setTimestamp) {
		let sunSetTime = new Date(setTimestamp);
		let realTimestamp = sunSetTime.getTime()/1000 + sunSetTime.getTimezoneOffset()*60;
		$.getJSON(`${timeURL.endpoint}?location=${place.lat},${place.lng}&timestamp=${realTimestamp}&key=${timeURL.key}`, function(json) {
			let offsets = json.dstOffset * 1000 + json.rawOffset * 1000;
			let setTime = new Date(realTimestamp*1000 + offsets);
			let realSet = setTime.getHours()%12 + ":" + fixMinutes(setTime.getMinutes());
			$sunsetDisplay.val(`${realSet} p.m.`);
		});
	}


	function getNearbyPoints(event) {
		event.preventDefault();
		let service = new google.maps.places.PlacesService(map);
		let location = {};
		location.lat = map.getCenter().lat();
		location.lng = map.getCenter().lng();
			service.nearbySearch({
				location: location,
				radius: 500,
				type: ['point_of_interest']
			}, callback);

			function callback(results, status) {
				if(status === google.maps.places.PlacesServiceStatus.OK) {
					for(let i = 0; i < results.length; i++) {
						createMarkerAndInfoWindow(results[i].geometry.location, results[i].name);
					}
				}
			}
	}
	
	function makeMap(location, readableAddress) {
		mapOptions = {
			center: location,
			zoom: 16
		};
		map = new google.maps.Map($mapDisplay,mapOptions);
		createMarkerAndInfoWindow(location, readableAddress);
	}

	function createMarkerAndInfoWindow(place, placeName) {
		let marker = new google.maps.Marker({
			position: place,
			map: map
		});

		let contentString = `<a href="${googleQueryString}q=${placeName}" target="_blank">${placeName}</a>`;
		let infowindow = new google.maps.InfoWindow({
			content: contentString,
		});

		marker.addListener("click", function() {
			infowindow.open(map, marker);
		});
	} 

}
