import { state } from "../state.js";
import {
  chooseGeocodingResult,
  getGeocodingResults,
  isValidCoordinate,
  showCustomModal,
} from "../utils.js";
import { SettingsManager } from "./settings.js";

export class Weather {
  constructor() {
    this.els = {
      widget: document.getElementById("weather-widget"),
      setupUI: document.getElementById("weather-setup-ui"),
      locInput: document.getElementById("widget-location-input"),
      saveBtn: document.getElementById("widget-save-btn"),
      gpsBtn: document.getElementById("widget-gps-btn"),
      detailsUI: document.querySelector("#weather-widget .weather-details"),
      currentUI: document.querySelector("#weather-widget .weather-current"),
      condition: document.getElementById("weather-condition"),
      humidity: document.getElementById("humidity-value"),
      bar: document.getElementById("humidity-bar"),
      temp: document.getElementById("current-temp"),
      feelsLike: document.getElementById("feels-like-temp"),
      location: document.getElementById("location"),
      icon: document.getElementById("weather-icon"),
    };
    this._weatherRequestId = 0;
    this._weatherController = null;
    this._searchRequestId = 0;
    this._searchController = null;
    this._refreshTimer = null;
    this._visibilityHandler = () => this.handleVisibilityChange();
    this.init();
  }

  init() {
    if (this.els.locInput) {
      this.els.locInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter")
          this.searchLocation(this.els.locInput.value.trim());
      });
    }
    if (this.els.saveBtn) {
      this.els.saveBtn.addEventListener("click", () => {
        if (this.els.locInput)
          this.searchLocation(this.els.locInput.value.trim());
      });
    }
    if (this.els.gpsBtn) {
      this.els.gpsBtn.addEventListener("click", () => this.detectLocation());
    }

    document.addEventListener("visibilitychange", this._visibilityHandler);
    this.fetchData();
    this.syncRefreshTimer();

    state.subscribe((key) => {
      if (
        key === "tempUnit" ||
        key === "locationUpdate" ||
        key === "tempDisplayMode"
      ) {
        if (!document.hidden) this.fetchData(key === "tempDisplayMode");
      }
      if (key === "widgetControl") this.syncRefreshTimer();
    });
  }

  isWeatherVisible() {
    const control = state.get("widgetControl") || "all";
    return ["all", "weather-only", "search-weather", "weather-quote"].includes(control);
  }

  syncRefreshTimer() {
    clearInterval(this._refreshTimer);
    this._refreshTimer = null;
    if (document.hidden || !this.isWeatherVisible()) return;
    this._refreshTimer = window.setInterval(() => this.fetchData(), 1800000);
  }

  handleVisibilityChange() {
    if (document.hidden) {
      this._weatherController?.abort();
      this._weatherController = null;
      this._weatherRequestId++;
      this.syncRefreshTimer();
      return;
    }
    this.syncRefreshTimer();
    this.fetchData();
  }

  async searchLocation(city) {
    if (!city) return;
    const requestId = ++this._searchRequestId;
    this._searchController?.abort();
    const controller = new AbortController();
    this._searchController = controller;
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5&language=en&format=json`,
        { signal: controller.signal },
      );
      if (!res.ok) throw new Error(`Geocoding request failed (${res.status})`);
      const results = getGeocodingResults(await res.json());
      if (requestId !== this._searchRequestId) return;
      if (results.length === 0) {
        showCustomModal(`Could not find city: "${city}".`);
        return;
      }
      const loc = await chooseGeocodingResult(results, city);
      if (requestId !== this._searchRequestId || !loc) return;
      state.set("yd_city", loc.name);
      state.set("yd_lat", Number(loc.latitude));
      state.set("yd_lon", Number(loc.longitude));
      state.set("locationUpdate", Date.now());
      if (this.els.locInput) this.els.locInput.value = "";
    } catch (e) {
      if (e?.name !== "AbortError" && requestId === this._searchRequestId) {
        console.error("Geocoding Error:", e);
        showCustomModal("Could not look up that location. Check your connection and try again.");
      }
    }
  }

  async detectLocation() {
    if (window.__settingsManagerInstance) {
      window.__settingsManagerInstance.detectLocation();
    } else {
      new SettingsManager().detectLocation();
    }
  }

  // --- SECTION: LOCATION LOGIC ---
  async getLocation() {
    const city = state.get("yd_city");
    const lat = state.get("yd_lat");
    const lon = state.get("yd_lon");

    if (
      typeof city === "string" &&
      city.trim() &&
      isValidCoordinate(lat, -90, 90) &&
      isValidCoordinate(lon, -180, 180)
    ) {
      return { latitude: Number(lat), longitude: Number(lon), city: city.trim() };
    }

    return null;
  }

  async reverseGeocode(lat, lon) {
    try {
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      );
      if (!res.ok) throw new Error(`Reverse geocoding failed (${res.status})`);
      const data = await res.json();
      if (!data || typeof data !== "object") throw new TypeError("Invalid reverse geocoding response");
      const city = [data.city, data.locality, data.principalSubdivision]
        .find((value) => typeof value === "string" && value.trim());
      return city || "Unknown Location";
    } catch (e) {
      return `${parseFloat(lat).toFixed(1)}, ${parseFloat(lon).toFixed(1)}`;
    }
  }

  // --- SECTION: DATA FETCHING ---
  async fetchData(onlyRender = false) {
    if (document.hidden) return;
    const requestId = ++this._weatherRequestId;
    this._weatherController?.abort();
    this._weatherController = null;
    try {
      const coords = await this.getLocation();
      if (requestId !== this._weatherRequestId) return;

      if (!coords) {
        if (this.els.setupUI) this.els.setupUI.classList.remove("hidden");
        if (this.els.detailsUI) this.els.detailsUI.style.display = "none";
        if (this.els.currentUI) this.els.currentUI.style.display = "none";
        if (this.els.widget) {
          this.els.widget.style.opacity = "1";
          this.els.widget.style.transform = "translateY(0)";
        }
        return;
      }

      if (this.els.setupUI) this.els.setupUI.classList.add("hidden");
      if (this.els.detailsUI) this.els.detailsUI.style.display = "";
      if (this.els.currentUI) this.els.currentUI.style.display = "";

      if (onlyRender && this.lastData) {
        this.render(this.lastData.current, this.lastData.daily, coords);
        return;
      }

      const unit =
        state.get("tempUnit") === "imperial" ? "fahrenheit" : "celsius";
      const controller = new AbortController();
      this._weatherController = controller;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=${unit}&timezone=auto`;

      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`Weather request failed (${res.status})`);
      const data = await res.json();
      const current = data?.current;
      const daily = data?.daily;
      const validCurrent =
        current &&
        Number.isFinite(Number(current.temperature_2m)) &&
        Number.isFinite(Number(current.relative_humidity_2m)) &&
        Number(current.relative_humidity_2m) >= 0 &&
        Number(current.relative_humidity_2m) <= 100 &&
        Number.isFinite(Number(current.apparent_temperature)) &&
        Number.isInteger(Number(current.weather_code)) &&
        Number(current.weather_code) >= 0;
      const validDaily =
        daily &&
        Array.isArray(daily.temperature_2m_min) &&
        Array.isArray(daily.temperature_2m_max) &&
        Number.isFinite(Number(daily.temperature_2m_min[0])) &&
        Number.isFinite(Number(daily.temperature_2m_max[0]));
      if (!validCurrent || !validDaily) throw new TypeError("Invalid weather response");
      if (requestId !== this._weatherRequestId) return;
      this.lastData = data;
      this.render(current, daily, coords);
    } catch (error) {
      if (error?.name === "AbortError" || requestId !== this._weatherRequestId) return;
      console.error("Weather Error:", error);
      if (this.els.condition)
        this.els.condition.textContent = "Weather Unavailable";
    }
  }

  // --- SECTION: RENDERING ---
  render(current, daily, coords) {
    if (!current) return;
    const code = current.weather_code;
    const wmo = this.getWmo(code);
    const unitSym = state.get("tempUnit") === "imperial" ? "°F" : "°C";

    if (this.els.condition) this.els.condition.textContent = wmo.desc;
    if (this.els.humidity)
      this.els.humidity.textContent = `${current.relative_humidity_2m}%`;
    if (this.els.bar)
      this.els.bar.style.width = `${current.relative_humidity_2m}%`;
    if (this.els.temp)
      this.els.temp.textContent = `${Math.round(current.temperature_2m)}°`;

    if (this.els.feelsLike) {
      if (
        state.get("tempDisplayMode") &&
        daily &&
        daily.temperature_2m_max &&
        daily.temperature_2m_min
      ) {
        this.els.feelsLike.textContent = `Min: ${Math.round(daily.temperature_2m_min[0])}° | Max: ${Math.round(daily.temperature_2m_max[0])}°`;
      } else {
        this.els.feelsLike.textContent = `Feels like ${Math.round(current.apparent_temperature)}${unitSym}`;
      }
    }

    if (this.els.icon) {
      this.els.icon.innerHTML = "";
      const span = document.createElement("span");
      span.style.fontSize = "42px";
      span.textContent = wmo.icon;
      this.els.icon.appendChild(span);
    }

    if (this.els.location) this.els.location.textContent = coords.city;

    if (this.els.widget) {
      this.els.widget.style.opacity = "1";
      this.els.widget.style.transform = "translateY(0)";
    }
  }

  getWmo(code) {
    const map = {
      0: { desc: "Clear Sky", icon: "☀️" },
      1: { desc: "Mainly Clear", icon: "🌤️" },
      2: { desc: "Partly Cloudy", icon: "⛅" },
      3: { desc: "Overcast", icon: "☁️" },
      45: { desc: "Fog", icon: "🌫️" },
      48: { desc: "Rime Fog", icon: "🌫️" },
      51: { desc: "Light Drizzle", icon: "🌦️" },
      53: { desc: "Moderate Drizzle", icon: "🌦️" },
      55: { desc: "Dense Drizzle", icon: "🌧️" },
      56: { desc: "Light Freezing Drizzle", icon: "🌧️" },
      57: { desc: "Dense Freezing Drizzle", icon: "🌧️" },
      61: { desc: "Light Rain", icon: "🌦️" },
      63: { desc: "Moderate Rain", icon: "🌧️" },
      65: { desc: "Heavy Rain", icon: "🌧️" },
      66: { desc: "Light Freezing Rain", icon: "🌧️" },
      67: { desc: "Heavy Freezing Rain", icon: "🌧️" },
      71: { desc: "Light Snow", icon: "🌨️" },
      73: { desc: "Moderate Snow", icon: "🌨️" },
      75: { desc: "Heavy Snow", icon: "❄️" },
      77: { desc: "Snow Grains", icon: "❄️" },
      80: { desc: "Light Rain Showers", icon: "🌦️" },
      81: { desc: "Moderate Rain Showers", icon: "🌧️" },
      82: { desc: "Violent Rain Showers", icon: "⛈️" },
      85: { desc: "Light Snow Showers", icon: "🌨️" },
      86: { desc: "Heavy Snow Showers", icon: "❄️" },
      95: { desc: "Thunderstorm", icon: "⛈️" },
      96: { desc: "Thunderstorm with Light Hail", icon: "⛈️" },
      99: { desc: "Thunderstorm with Heavy Hail", icon: "⛈️" },
    };
    return map[code] || { desc: "Unknown", icon: "❓" };
  }
}
// [src/modules/weather.js] YourDynamicDashboard V3.0.0 (Ditom Baroi Antu - 2025-26)
