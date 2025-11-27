// script.js - API key embedded for demo (Option 1)
const API_KEY = "bd5e378503939ddaee76f12ad7a97608"; // <-- embedded key (public demo)
const ICON_URL = "https://openweathermap.org/img/wn/"; // e.g. ICON_URL + "10d@2x.png"

const $ = id => document.getElementById(id);

// elements
const cityInput = $("cityInput");
const searchBtn = $("searchBtn");
const geoBtn = $("geoBtn");
const loadingEl = $("loading");
const errorEl = $("error");
const currentEl = $("current");
const locationName = $("locationName");
const currentIcon = $("currentIcon");
const tempEl = $("temp");
const descEl = $("description");
const humidityEl = $("humidity");
const windEl = $("wind");
const forecastEl = $("forecast");
const forecastTitle = $("forecastTitle");
const themeToggle = $("themeToggle");

// events
searchBtn.addEventListener("click", () => fetchByCity(cityInput.value.trim()));
cityInput.addEventListener("keydown", (e) => { if (e.key === "Enter") fetchByCity(cityInput.value.trim()); });
geoBtn.addEventListener("click", useGeolocation);
themeToggle.addEventListener("change", () => document.body.classList.toggle("dark", themeToggle.checked));

// helpers
function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove("hidden");
  loadingEl.classList.add("hidden");
  currentEl.classList.add("hidden");
  forecastEl.classList.add("hidden");
  forecastTitle.classList.add("hidden");
}
function clearError() {
  errorEl.classList.add("hidden");
  errorEl.textContent = "";
}
function showLoading() {
  loadingEl.classList.remove("hidden");
  clearError();
}
function hideLoading() {
  loadingEl.classList.add("hidden");
}

if (!API_KEY) {
  console.warn("No OpenWeatherMap API key found. Please add one.");
  showError("No API key configured.");
}

// fetch current weather by city
async function fetchByCity(city) {
  if (!city) { showError("Please enter a city name."); return; }
  if (!API_KEY) { showError("API key not set."); return; }

  showLoading();
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) { throw new Error(data.message || "City not found"); }
    renderCurrent(data);
    await fetchForecast(data.coord.lat, data.coord.lon);
    // save last city
    try { localStorage.setItem("lastCity", city); } catch(e){/*ignore*/ }
  } catch (err) {
    showError(err.message || "Failed to fetch weather");
  } finally { hideLoading(); }
}

// fetch forecast (5-day / 3-hour forecast) and convert to daily
async function fetchForecast(lat, lon) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) { throw new Error(data.message || "Forecast error"); }
    const daily = reduceForecastToDaily(data.list);
    renderForecast(daily);
  } catch (err) {
    forecastEl.classList.add("hidden");
    forecastTitle.classList.add("hidden");
    console.warn("Forecast fetch failed", err);
  }
}

// convert 3-hour chunks to one per day (choose item near 12:00 or middle)
function reduceForecastToDaily(list) {
  const days = {};
  list.forEach(item => {
    const d = new Date(item.dt * 1000);
    const dayKey = d.toISOString().slice(0,10);
    if (!days[dayKey]) days[dayKey] = [];
    days[dayKey].push(item);
  });
  const results = [];
  Object.keys(days).slice(0,6).forEach(dayKey => {
    const items = days[dayKey];
    let pick = items.reduce((best, cur) => {
      const target = 12;
      const bestHour = new Date(best.dt*1000).getUTCHours();
      const curHour = new Date(cur.dt*1000).getUTCHours();
      return (Math.abs(curHour - target) < Math.abs(bestHour - target)) ? cur : best;
    }, items[0]);
    results.push(pick);
  });
  return results.slice(0,5);
}

function renderCurrent(data) {
  clearError();
  currentEl.classList.remove("hidden");
  const icon = data.weather[0].icon;
  currentIcon.src = `${ICON_URL}${icon}@2x.png`;
  currentIcon.alt = data.weather[0].description || "weather icon";
  locationName.textContent = `${data.name}, ${data.sys?.country || ""}`;
  tempEl.innerHTML = `${Math.round(data.main.temp)}<sup>°C</sup>`;
  descEl.textContent = data.weather[0].description || "";
  humidityEl.textContent = `Humidity: ${data.main.humidity}%`;
  windEl.textContent = `Wind: ${data.wind.speed} m/s`;
  applyBackgroundByWeather(data.weather[0].id);
}

function renderForecast(dailyList) {
  if (!dailyList || dailyList.length === 0) {
    forecastEl.classList.add("hidden");
    forecastTitle.classList.add("hidden");
    return;
  }
  forecastEl.innerHTML = "";
  dailyList.forEach(item => {
    const d = new Date(item.dt * 1000);
    const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
    const icon = item.weather[0].icon;
    const min = Math.round(item.main.temp_min);
    const max = Math.round(item.main.temp_max);
    const el = document.createElement("div");
    el.className = "day";
    el.innerHTML = `
      <div class="dayname">${weekday}</div>
      <img src="${ICON_URL}${icon}@2x.png" alt="${item.weather[0].description}" />
      <div class="temps">${max}° / ${min}°</div>
      <div class="desc small">${item.weather[0].description}</div>
    `;
    forecastEl.appendChild(el);
  });
  forecastTitle.classList.remove("hidden");
  forecastEl.classList.remove("hidden");
}

function applyBackgroundByWeather(id) {
  const body = document.body;
  if (id >= 200 && id < 600) {
    body.style.background = "linear-gradient(180deg,#2b5876,#4e4376)";
  } else if (id >= 600 && id < 700) {
    body.style.background = "linear-gradient(180deg,#83a4d4,#b6fbff)";
  } else if (id === 800) {
    body.style.background = "linear-gradient(180deg,#56ccf2,#2f80ed)";
  } else {
    body.style.background = "linear-gradient(180deg,#cfd9df,#e2ebf0)";
  }
}

// geolocation
function useGeolocation() {
  if (!navigator.geolocation) {
    showError("Geolocation not supported by your browser.");
    return;
  }
  showLoading();
  navigator.geolocation.getCurrentPosition(async pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Reverse geocode error");
      renderCurrent(data);
      await fetchForecast(lat, lon);
    } catch (err) {
      showError(err.message || "Failed to get location weather.");
    } finally {
      hideLoading();
    }
  }, err => {
    hideLoading();
    showError("Unable to retrieve your location: " + (err.message || "permission denied"));
  }, { timeout: 10000 });
}

// load last searched city
try {
  const last = localStorage.getItem("lastCity");
  if (last) fetchByCity(last);
  else fetchByCity("Bengaluru");
} catch(e) {
  fetchByCity("Bengaluru");
}
