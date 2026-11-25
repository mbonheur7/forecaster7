const form = document.querySelector("#search-form");
const cityInput = document.querySelector("#city-input");
const message = document.querySelector("#message");
const resultsBox = document.querySelector("#search-results");
const weatherSection = document.querySelector("#weather-section");
const unitSelect = document.querySelector("#unit-select");
const filterSelect = document.querySelector("#condition-filter");
const sortSelect = document.querySelector("#sort-select");

let selectedLocation = null;
let weatherData = null;

const weatherDescriptions = {
  0:["Clear sky","☀","sun"],1:["Mainly clear","🌤","sun"],2:["Partly cloudy","⛅","cloud"],3:["Overcast","☁","cloud"],
  45:["Fog","🌫","cloud"],48:["Depositing rime fog","🌫","cloud"],51:["Light drizzle","🌦","rain"],53:["Drizzle","🌦","rain"],
  55:["Dense drizzle","🌧","rain"],56:["Freezing drizzle","🌧","rain"],57:["Dense freezing drizzle","🌧","rain"],
  61:["Slight rain","🌦","rain"],63:["Moderate rain","🌧","rain"],65:["Heavy rain","🌧","rain"],66:["Freezing rain","🌧","rain"],
  67:["Heavy freezing rain","🌧","rain"],71:["Slight snow","🌨","snow"],73:["Moderate snow","🌨","snow"],75:["Heavy snow","❄","snow"],
  77:["Snow grains","❄","snow"],80:["Rain showers","🌦","rain"],81:["Moderate showers","🌧","rain"],82:["Violent showers","⛈","rain"],
  85:["Snow showers","🌨","snow"],86:["Heavy snow showers","❄","snow"],95:["Thunderstorm","⛈","storm"],96:["Thunderstorm with hail","⛈","storm"],99:["Thunderstorm with heavy hail","⛈","storm"]
};

function weatherInfo(code) {
  return weatherDescriptions[code] || ["Unknown conditions","☁","cloud"];
}
function setMessage(text, isError=false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}
function convertTemp(value) {
  return unitSelect.value === "fahrenheit" ? (value * 9 / 5) + 32 : value;
}
function roundedTemp(value) {
  return `${Math.round(convertTemp(value))}°`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const city = cityInput.value.trim();
  if (city.length < 2) return setMessage("Enter at least two characters.", true);
  const button = document.querySelector("#search-button");
  button.disabled = true;
  button.textContent = "Searching…";
  resultsBox.hidden = true;
  setMessage("Looking up that location…");
  try {
    const response = await fetch(`/api/search?city=${encodeURIComponent(city)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Location search failed.");
    showLocations(payload.results);
  } catch (error) {
    setMessage(error.message, true);
  } finally {
    button.disabled = false;
    button.innerHTML = 'Search <span>→</span>';
  }
});

function showLocations(locations) {
  resultsBox.innerHTML = "";
  locations.forEach((location) => {
    const button = document.createElement("button");
    button.className = "result-option";
    button.type = "button";
    button.textContent = [location.name, location.admin1, location.country].filter(Boolean).join(", ");
    button.addEventListener("click", () => loadWeather(location));
    resultsBox.appendChild(button);
  });
  resultsBox.hidden = false;
  setMessage("Choose the correct location from the results.");
}

async function loadWeather(location) {
  selectedLocation = location;
  resultsBox.hidden = true;
  setMessage("Fetching the latest forecast…");
  try {
    const query = new URLSearchParams({latitude: location.latitude, longitude: location.longitude});
    const response = await fetch(`/api/weather?${query}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Could not load weather.");
    weatherData = payload;
    document.querySelector("#location-name").textContent = location.name;
    document.querySelector("#location-meta").textContent = [location.admin1, location.country, payload.timezone].filter(Boolean).join(" · ");
    weatherSection.hidden = false;
    renderWeather();
    setMessage("Forecast updated successfully.");
    weatherSection.scrollIntoView({behavior:"smooth", block:"start"});
  } catch (error) {
    setMessage(error.message, true);
  }
}

function renderWeather() {
  if (!weatherData) return;
  const current = weatherData.current;
  const unit = unitSelect.value === "fahrenheit" ? "°F" : "°C";
  const info = weatherInfo(current.weather_code);
  document.querySelector("#current-temp").textContent = Math.round(convertTemp(current.temperature_2m));
  document.querySelector("#current-unit").textContent = unit;
  document.querySelector("#current-description").textContent = info[0];
  document.querySelector("#current-icon").textContent = info[1];
  document.querySelector("#feels-like").textContent = `Feels like ${roundedTemp(current.apparent_temperature)}`;
  document.querySelector("#humidity").textContent = `${current.relative_humidity_2m}%`;
  document.querySelector("#wind").textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  document.querySelector("#rain").textContent = `${current.precipitation} mm`;

  let days = weatherData.daily.time.map((date, index) => ({
    date,
    code: weatherData.daily.weather_code[index],
    max: weatherData.daily.temperature_2m_max[index],
    min: weatherData.daily.temperature_2m_min[index],
    rain: weatherData.daily.precipitation_probability_max[index] ?? 0
  }));

  const filter = filterSelect.value;
  if (filter !== "all") days = days.filter(day => weatherInfo(day.code)[2] === filter);
  const sort = sortSelect.value;
  if (sort === "warmest") days.sort((a,b) => b.max-a.max);
  if (sort === "coldest") days.sort((a,b) => a.min-b.min);
  if (sort === "rain") days.sort((a,b) => b.rain-a.rain);
  if (sort === "date") days.sort((a,b) => a.date.localeCompare(b.date));

  const grid = document.querySelector("#forecast-grid");
  grid.innerHTML = "";
  if (!days.length) {
    grid.textContent = "No forecast days match this filter.";
    return;
  }
  days.forEach(day => {
    const info = weatherInfo(day.code);
    const card = document.createElement("article");
    card.className = "day-card";
    const date = new Date(`${day.date}T12:00:00`);
    const dayName = date.toLocaleDateString(undefined, {weekday:"short", month:"short", day:"numeric"});
    card.innerHTML = `<div class="day-name"></div><div class="day-icon" aria-hidden="true"></div><div class="day-condition"></div><div class="temps"><strong></strong><span></span></div><div class="rain-chance"></div>`;
    card.querySelector(".day-name").textContent = dayName;
    card.querySelector(".day-icon").textContent = info[1];
    card.querySelector(".day-condition").textContent = info[0];
    card.querySelector(".temps strong").textContent = roundedTemp(day.max);
    card.querySelector(".temps span").textContent = roundedTemp(day.min);
    card.querySelector(".rain-chance").textContent = `☂ ${day.rain}% rain chance`;
    grid.appendChild(card);
  });
}

unitSelect.addEventListener("change", renderWeather);
filterSelect.addEventListener("change", renderWeather);
sortSelect.addEventListener("change", renderWeather);
