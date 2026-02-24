import { state } from "../state.js";
import { showCustomModal } from "../utils.js";
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

    this.fetchData();
    setInterval(() => this.fetchData(), 1800000);

    state.subscribe((key) => {
      if (
        key === "tempUnit" ||
        key === "locationUpdate" ||
        key === "tempDisplayMode"
      ) {
        this.fetchData(key === "tempDisplayMode");
      }
    });
  }

  async searchLocation(city) {
    if (!city) return;
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
      );
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const loc = data.results[0];
        state.set("yd_city", loc.name);
        state.set("yd_lat", loc.latitude);
        state.set("yd_lon", loc.longitude);
        state.set("locationUpdate", Date.now());
        if (this.els.locInput) this.els.locInput.value = "";
      } else {
        showCustomModal(`Could not find city: "${city}".`);
      }
    } catch (e) {
      showCustomModal("Connection error.");
    }
  }

  async detectLocation() {
    new SettingsManager().detectLocation();
  }

  // --- SECTION: LOCATION LOGIC ---
  async getLocation() {
    const city = state.get("yd_city");
    const lat = state.get("yd_lat");
    const lon = state.get("yd_lon");

    if (city && lat && lon && lat !== "0" && lon !== "0") {
      return { latitude: lat, longitude: lon, city: city };
    }

    return null;
  }

  async reverseGeocode(lat, lon) {
    try {
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      );
      const data = await res.json();
      return data.city || data.locality || "Unknown Location";
    } catch (e) {
      return `${parseFloat(lat).toFixed(1)}, ${parseFloat(lon).toFixed(1)}`;
    }
  }

  // --- SECTION: DATA FETCHING ---
  async fetchData(onlyRender = false) {
    try {
      const coords = await this.getLocation();

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
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=${unit}&timezone=auto`;

      const res = await fetch(url);
      const data = await res.json();
      this.lastData = data;
      this.render(data.current, data.daily, coords);

      // --- PIN DEFAULT TASKS ONLY ONCE WHEN WEATHER LOADS ---
      if (!state.get("defaultTasksPinned")) {
        const todos = state.get("todos") || [];
        let modified = false;
        todos.forEach((t) => {
          if (
            (String(t.id) === "dt-1" || String(t.id) === "dt-2") &&
            !t.completed
          ) {
            t.pinned = true;
            modified = true;
          }
        });
        if (modified) {
          state.set("todos", todos);
        }
        state.set("defaultTasksPinned", true);
        import("../utils.js").then((utils) => {
          utils.progressDefaultTasks();
        });
      }
    } catch (error) {
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
      51: { desc: "Drizzle", icon: "🌦️" },
      61: { desc: "Rain", icon: "🌧️" },
      71: { desc: "Snow", icon: "🌨️" },
      95: { desc: "Thunderstorm", icon: "⛈️" },
    };
    return map[code] || { desc: "Unknown", icon: "❓" };
  }
}

// src/modules/weather.js YourDynamicDashboard V2.1 (Ditom Baroi Antu - 2025-26)
