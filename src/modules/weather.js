// src/modules/weather.js YourDynamicDashboard (Ditom Baroi Antu - 2025-26)

import { state } from '../state.js';

export class Weather {
    constructor() {
        this.els = {
            widget: document.getElementById('weather-widget'),
            condition: document.getElementById('weather-condition'),
            humidity: document.getElementById('humidity-value'),
            bar: document.getElementById('humidity-bar'),
            temp: document.getElementById('current-temp'),
            feelsLike: document.getElementById('feels-like-temp'),
            location: document.getElementById('location'),
            icon: document.getElementById('weather-icon')
        };
        this.init();
    }

    init() {
        this.fetchData();
        // Refresh every 30 minutes
        setInterval(() => this.fetchData(), 1800000); 
        
        state.subscribe((key) => { if (key === 'tempUnit' || key === 'locationUpdate') this.fetchData(); });
    }

    // --- SECTION: LOCATION LOGIC ---
    async getLocation() {
        // Strict: Only use saved city if it has coordinates.
        const city = state.get('yd_city');
        const lat = state.get('yd_lat');
        const lon = state.get('yd_lon');

        // Verify we have real coordinates (not 0,0 default placeholders if any)
        if (city && lat && lon && lat !== '0' && lon !== '0') {
            return { latitude: lat, longitude: lon, city: city };
        }

        // Fallback to GPS
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject('Geolocation not supported');
            navigator.geolocation.getCurrentPosition(
                async pos => {
                    const gpsLat = pos.coords.latitude;
                    const gpsLon = pos.coords.longitude;
                    const gpsCity = await this.reverseGeocode(gpsLat, gpsLon);
                    resolve({ latitude: gpsLat, longitude: gpsLon, city: gpsCity });
                },
                err => reject(err)
            );
        });
    }

    async reverseGeocode(lat, lon) {
        try {
            const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
            const data = await res.json();
            return data.city || data.locality || "Unknown Location";
        } catch (e) {
            return `${parseFloat(lat).toFixed(1)}, ${parseFloat(lon).toFixed(1)}`;
        }
    }

    // --- SECTION: DATA FETCHING ---
    async fetchData() {
        try {
            const coords = await this.getLocation();
            const unit = state.get('tempUnit') === 'imperial' ? 'fahrenheit' : 'celsius';
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code&temperature_unit=${unit}`;
            
            const res = await fetch(url);
            const data = await res.json();
            this.render(data.current, coords);
        } catch (error) {
            console.error("Weather Error:", error);
            if(this.els.condition) this.els.condition.textContent = "Weather Unavailable";
        }
    }

    // --- SECTION: RENDERING ---
    render(current, coords) {
        if (!current) return;
        const code = current.weather_code;
        const wmo = this.getWmo(code);
        const unitSym = state.get('tempUnit') === 'imperial' ? '°F' : '°C';

        if(this.els.condition) this.els.condition.textContent = wmo.desc;
        if(this.els.humidity) this.els.humidity.textContent = `${current.relative_humidity_2m}%`;
        if(this.els.bar) this.els.bar.style.width = `${current.relative_humidity_2m}%`;
        if(this.els.temp) this.els.temp.textContent = `${Math.round(current.temperature_2m)}°`;
        if(this.els.feelsLike) this.els.feelsLike.textContent = `Feels like ${Math.round(current.apparent_temperature)}${unitSym}`;
        
        if(this.els.icon) {
            this.els.icon.innerHTML = '';
            const span = document.createElement('span');
            span.style.fontSize = '42px';
            span.textContent = wmo.icon;
            this.els.icon.appendChild(span);
        }

        if(this.els.location) this.els.location.textContent = coords.city;
        
        if(this.els.widget) {
            this.els.widget.style.opacity = '1';
            this.els.widget.style.transform = 'translateY(0)';
        }
    }

    getWmo(code) {
        const map = { 0: { desc: "Clear Sky", icon: "☀️" }, 1: { desc: "Mainly Clear", icon: "🌤️" }, 2: { desc: "Partly Cloudy", icon: "⛅" }, 3: { desc: "Overcast", icon: "☁️" }, 45: { desc: "Fog", icon: "🌫️" }, 51: { desc: "Drizzle", icon: "🌦️" }, 61: { desc: "Rain", icon: "🌧️" }, 71: { desc: "Snow", icon: "🌨️" }, 95: { desc: "Thunderstorm", icon: "⛈️" } };
        return map[code] || { desc: "Unknown", icon: "❓" };
    }
}

// src/modules/weather.js YourDynamicDashboard (Ditom Baroi Antu - 2025-26)