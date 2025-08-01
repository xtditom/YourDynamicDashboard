// script.js (Ditom Baroi Antu)

const masterClockContainer = document.querySelector('.master-clock-container');
const hourHand = document.getElementById('hour-hand');
const minuteHand = document.getElementById('minute-hand');
const secondDot = document.getElementById('second-dot');
const hoursElement = document.getElementById('clock-hours');
const minutesElement = document.getElementById('clock-minutes');
const secondsElement = document.getElementById('clock-seconds');
const ampmElement = document.getElementById('clock-ampm');
const greetingElement = document.getElementById('greeting-text');
const welcomeTextElement = document.getElementById('welcome-text');
const weatherWidget = document.getElementById('weather-widget');
const weatherConditionElement = document.getElementById('weather-condition');
const humidityBarElement = document.getElementById('humidity-bar');
const humidityValueElement = document.getElementById('humidity-value');
const feelsLikeElement = document.getElementById('feels-like-temp');
const locationElement = document.getElementById('location');
const weatherIconElement = document.getElementById('weather-icon');
const currentTempElement = document.getElementById('current-temp');
const searchForm = document.getElementById('search-form');
const searchInputElement = document.getElementById('search-input');
const shortcutsContainer = document.getElementById('shortcuts-container');
const searchSwitcherWidget = document.getElementById('search-switcher-widget');
const searchSwitcherButton = document.getElementById('search-switcher-button');
const searchEnginesContainer = document.getElementById('search-engines');
const searchPlatformsContainer = document.getElementById('search-platforms');
const welcomePopupOverlay = document.getElementById('welcome-modal-overlay');
const welcomeCloseButton = document.getElementById('welcome-modal-close');

let clockFormat = localStorage.getItem('clockFormat') || '12';
let clockType = localStorage.getItem('clockType') || 'digital';
let tempUnit = localStorage.getItem('tempUnit') || 'metric';
const searchSuggestions = [
    'How to learn a new language', 'Easy dinner recipes for tonight', 'Latest world news headlines',
    'Best movies of the year', 'How to save money effectively', 'Local weather forecast',
    'Online courses for coding', 'Symptoms of the common cold', 'Best places to travel in Europe',
    'How to write a professional resume', 'DIY home decor ideas', 'Beginner workout routines at home',
    'What is cryptocurrency?', 'Healthy breakfast ideas', 'Top 10 most popular songs',
    'How to tie a tie', 'Latest smartphone reviews', 'Gardening tips for beginners',
    'How to sleep better at night', 'Stock market today', 'Translate English to Spanish',
    'Learn to play guitar for beginners', 'Best books to read this year', 'How to start a small business',
    'Easy chicken recipes', 'Meditation for anxiety', 'Cheap flight tickets',
    'What is Artificial Intelligence?', 'How to fix a leaky faucet', 'Job search websites',
    'Best TV shows on Netflix', 'How to cook rice perfectly', 'Daily horoscope',
    'Funny cat videos', 'Productivity tips for work', 'How to create a website',
    'Healthy smoothie recipes', 'Amazon online shopping', 'Wikipedia',
    'YouTube', 'Best coffee shops near me', 'How to improve memory',
    'Latest fashion trends', 'Car maintenance tips', 'How to set personal goals',
    'Best cameras for photography', 'Learn digital marketing', 'Easy dessert recipes',
    'How to be more confident', 'History of the internet'
];
let suggestionIndex = 0;

let userShortcuts = [];
const initialShortcuts = [
    { name: 'YouTube', url: 'https://www.youtube.com' },
    { name: 'Gmail', url: 'https://mail.google.com' },
    { name: 'Wikipedia', url: 'https://www.wikipedia.org' },
    { name: 'Facebook', url: 'https://www.facebook.com' },
    { name: 'Amazon', url: 'https://www.amazon.com' }
];

const searchProviders = {
    engines: [
        { id: 'google', name: 'Google', url: 'https://www.google.com/search', queryParam: 'q', icon: 'Search Tools/google.png' },
        { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search', queryParam: 'q', icon: 'Search Tools/bing.png' },
        { id: 'yahoo', name: 'Yahoo', url: 'https://search.yahoo.com/search', queryParam: 'p', icon: 'Search Tools/yahoo.png' },
        { id: 'brave', name: 'Brave', url: 'https://search.brave.com/search', queryParam: 'q', icon: 'Search Tools/brave.png' },
        { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/', queryParam: 'q', icon: 'Search Tools/duckduckgo.png' },
        { id: 'yandex', name: 'Yandex', url: 'https://yandex.com/search/', queryParam: 'text', icon: 'Search Tools/yandex.png' },
    ],
    platforms: [
        { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com/results', queryParam: 'search_query', icon: 'Search Tools/youtube.png' },
        { id: 'spotify', name: 'Spotify', url: 'https://open.spotify.com/search', searchType: 'path', icon: 'Search Tools/spotify.png' },
        { id: 'wikipedia', name: 'Wikipedia', url: 'https://en.wikipedia.org/w/index.php', queryParam: 'search', icon: 'Search Tools/wikipedia.png' },
        { id: 'pinterest', name: 'Pinterest', url: 'https://www.pinterest.com/search/pins/', queryParam: 'q', icon: 'Search Tools/pinterest.png' },
        { id: 'reddit', name: 'Reddit', url: 'https://www.reddit.com/search/', queryParam: 'q', icon: 'Search Tools/reddit.png' },
        { id: 'quora', name: 'Quora', url: 'https://www.quora.com/search', queryParam: 'q', icon: 'Search Tools/quora.png' }
    ]
};
let currentSearch = {};


function loadShortcuts() {
    const savedShortcuts = localStorage.getItem('userShortcuts');
    if (savedShortcuts) {
        userShortcuts = JSON.parse(savedShortcuts);
    } else {
        userShortcuts = initialShortcuts.map(sc => ({...sc, icon: getIconUrl(sc.url)}));
        saveShortcuts();
    }
}

function saveShortcuts() {
    localStorage.setItem('userShortcuts', JSON.stringify(userShortcuts));
}

function getIconUrl(url) {
    try {
        const urlObject = new URL(url);
        return `https://www.google.com/s2/favicons?sz=64&domain=${urlObject.hostname}`;
    } catch (e) {
        return 'invalid_icon'; 
    }
}

function addShortcut(name, url) {
    if (!name || !url) return;
    userShortcuts.push({
        name: name,
        url: url,
        icon: getIconUrl(url)
    });
    saveShortcuts();
    renderShortcuts();
    renderShortcutEditor();
}

function updateShortcut(index, newName, newUrl) {
    if (!userShortcuts[index]) return;
    userShortcuts[index].name = newName;
    userShortcuts[index].url = newUrl;
    userShortcuts[index].icon = getIconUrl(newUrl);
    saveShortcuts();
    renderShortcuts();
    renderShortcutEditor();
}

function deleteShortcut(index) {
    if (!userShortcuts[index]) return;
    userShortcuts.splice(index, 1);
    saveShortcuts();
    renderShortcuts();
    renderShortcutEditor();
}

function handleSearchSubmit(event) {
    event.preventDefault();
    const searchTerm = searchInputElement.value;
    if (!searchTerm) return;
    const provider = searchProviders[currentSearch.type]?.find(p => p.id === currentSearch.id);
    if (!provider) return;
    let finalUrl = '';
    if (provider.searchType === 'path') {
        finalUrl = `${provider.url}/${encodeURIComponent(searchTerm)}`;
    } else {
        const queryParam = provider.queryParam || 'q';
        finalUrl = `${provider.url}?${queryParam}=${encodeURIComponent(searchTerm)}`;
        if (provider.tbm) {
            finalUrl += `&tbm=${provider.tbm}`;
        }
    }
    window.location.href = finalUrl;
    searchInputElement.value = '';
}


const formatTime = (time) => String(time).padStart(2, '0');

function updateDigitalClock(now) {
    if (!hoursElement) return;
    let hours = now.getHours();
    if (clockFormat === '12') {
        if (ampmElement) ampmElement.textContent = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
    } else {
        if (ampmElement) ampmElement.textContent = '';
    }
    hoursElement.textContent = formatTime(hours);
    minutesElement.textContent = formatTime(now.getMinutes());
    secondsElement.textContent = formatTime(now.getSeconds());
}


function updateAnalogClock(now) {
    if (!hourHand || !minuteHand || !secondDot) return;
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const secondsWithMs = now.getSeconds() + now.getMilliseconds() / 1000;
    const hourDegrees = (hours % 12 + minutes / 60) * 30;
    hourHand.style.transform = `rotate(${hourDegrees}deg)`;
    const minuteDegrees = (minutes + secondsWithMs / 60) * 6;
    minuteHand.style.transform = `rotate(${minuteDegrees}deg)`;
    const secondAngle = secondsWithMs * 6 - 90;
    const secondRadius = 85;
    const centerX = 100;
    const centerY = 100;
    const secondRadian = secondAngle * (Math.PI / 180);
    const secondX = centerX + secondRadius * Math.cos(secondRadian);
    const secondY = centerY + secondRadius * Math.sin(secondRadian);
    secondDot.setAttribute('cx', secondX);
    secondDot.setAttribute('cy', secondY);
}

function setClockType(type) {
    if (!masterClockContainer) return;
    clockType = type;
    if (type === 'analog') {
        masterClockContainer.classList.remove('digital-active');
        masterClockContainer.classList.add('analog-active');
        masterClockContainer.style.height = '250px';
    } else {
        masterClockContainer.classList.remove('analog-active');
        masterClockContainer.classList.add('digital-active');
        masterClockContainer.style.height = '120px';
    }
}

function animationLoop() {
    const now = new Date();
    if (clockType === 'analog') {
        updateAnalogClock(now);
    }
    requestAnimationFrame(animationLoop);
}

function typewriter(element, text, speed = 75) {
    element.classList.add('typing-effect');
    let i = 0;
    element.textContent = '';
    const typing = setInterval(() => {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
        } else {
            clearInterval(typing);
            element.classList.remove('typing-effect');
        }
    }, speed);
}

function updateGreeting() {
    if (!greetingElement) return;
    const hour = new Date().getHours();
    let greeting;
    if (hour >= 5 && hour < 6) greeting = "Do you get up early?";
    else if (hour >= 6 && hour < 12) greeting = "Good morning";
    else if (hour >= 12 && hour < 18) greeting = "Good afternoon";
    else if (hour >= 18 && hour < 20) greeting = "Good evening";
    else if (hour >= 20 && hour < 24) greeting = "Good night";
    else greeting = "Are you still awake?";
    setTimeout(() => {
        typewriter(greetingElement, greeting);
    }, 800);
}

function manageWelcomeText() {
    if (!welcomeTextElement) return;
    welcomeTextElement.textContent = localStorage.getItem('welcomeText') || 'Click to edit';
    welcomeTextElement.addEventListener('blur', () => localStorage.setItem('welcomeText', welcomeTextElement.textContent));
    welcomeTextElement.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }});
}

function getWeather() {
    const apiKey = localStorage.getItem('weatherApiKey');
    if (!apiKey) {
        if(weatherWidget) weatherWidget.innerHTML = '<p class="weather-api-notice">Please add your Weather API Key in the settings to see the weather.</p>';
        return;
    }
    navigator.geolocation.getCurrentPosition(
        position => {
            const { latitude, longitude } = position.coords;
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=${tempUnit}`;
            fetch(url).then(res => res.json()).then(updateWeatherUI).catch(handleWeatherError);
        },
        handleWeatherError
    );
}

function updateWeatherUI(data) {
    if (!data || !weatherConditionElement) return;
    if (data.cod !== 200) {
        handleWeatherError({ message: data.message || "Invalid API Key or location." });
        return;
    }
    const description = data.weather[0].description;
    weatherConditionElement.textContent = description.charAt(0).toUpperCase() + description.slice(1);
    humidityValueElement.textContent = `${data.main.humidity}%`;
    humidityBarElement.style.width = `${data.main.humidity}%`;
    const tempSymbol = tempUnit === 'metric' ? 'C' : 'F';
    currentTempElement.textContent = `${Math.round(data.main.temp)}°`;
    if (feelsLikeElement) {
        feelsLikeElement.textContent = `Feels like ${Math.round(data.main.feels_like)}°${tempSymbol}`;
    }
    locationElement.textContent = data.name;
}

function handleWeatherError(error) {
    console.error("Weather Error:", error);
    if(weatherWidget) weatherWidget.innerHTML = `<p class="weather-api-notice">Weather unavailable. ${error.message}</p>`;
}

function manageSearchSuggestions() {
    if (!searchInputElement) return;
    let lastSuggestionIndex = -1; 
    const showRandomSuggestion = () => {
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * searchSuggestions.length);
        } while (searchSuggestions.length > 1 && randomIndex === lastSuggestionIndex);
        searchInputElement.placeholder = searchSuggestions[randomIndex];
        lastSuggestionIndex = randomIndex;
    };
    showRandomSuggestion();
    setInterval(showRandomSuggestion, 10000);
}

function renderShortcuts() {
    if (!shortcutsContainer) return;
    shortcutsContainer.innerHTML = '';
    userShortcuts.forEach((shortcut, index) => {
        const link = document.createElement('a');
        link.href = shortcut.url;
        link.className = 'shortcut-item';
        link.style.transitionDelay = `${index * 125}ms`;
        const iconDiv = document.createElement('div');
        iconDiv.className = 'shortcut-icon';
        const iconImg = document.createElement('img');
        iconImg.src = shortcut.icon;
        iconImg.alt = shortcut.name;
        iconImg.onerror = () => {
            iconImg.style.display = 'none';
            const fallback = document.createElement('span');
            fallback.className = 'shortcut-fallback-text';
            fallback.textContent = shortcut.name.charAt(0).toUpperCase();
            iconDiv.appendChild(fallback);
        };
        const label = document.createElement('span');
        label.className = 'shortcut-label';
        label.textContent = shortcut.name;
        iconDiv.appendChild(iconImg);
        link.appendChild(iconDiv);
        link.appendChild(label);
        shortcutsContainer.appendChild(link);
    });
}

function renderSearchSwitcher() {
    if (!searchEnginesContainer || !searchPlatformsContainer) return;
    searchEnginesContainer.innerHTML = '';
    searchPlatformsContainer.innerHTML = '';
    const createButton = (provider, type) => {
        const button = document.createElement('button');
        button.className = 'search-option-btn';
        button.dataset.id = provider.id;
        button.dataset.type = type;
        const iconImg = document.createElement('img');
        iconImg.src = provider.icon;
        iconImg.alt = provider.name;
        iconImg.className = 'search-option-icon';
        const nameSpan = document.createElement('span');
        nameSpan.textContent = provider.name;
        button.appendChild(iconImg);
        button.appendChild(nameSpan);
        if (provider.id === currentSearch.id && type === currentSearch.type) {
            button.classList.add('active');
        }
        return button;
    };
    searchProviders.engines.forEach(engine => {
        searchEnginesContainer.appendChild(createButton(engine, 'engines'));
    });
    searchProviders.platforms.forEach(platform => {
        searchPlatformsContainer.appendChild(createButton(platform, 'platforms'));
    });
}

function initializeSearchSwitcher() {
    const savedSearch = JSON.parse(localStorage.getItem('currentSearch'));
    currentSearch = savedSearch || { type: 'engines', id: 'google' };
    renderSearchSwitcher();
    if (currentSearch.type === 'platforms') {
        searchSwitcherButton.textContent = 'Search On';
        searchEnginesContainer.classList.remove('active');
        searchPlatformsContainer.classList.add('active');
    } else {
        searchSwitcherButton.textContent = 'Search With';
        searchEnginesContainer.classList.add('active');
        searchPlatformsContainer.classList.remove('active');
    }
    searchSwitcherButton.addEventListener('click', () => {
        const isEngines = searchEnginesContainer.classList.contains('active');
        if (isEngines) {
            searchSwitcherButton.textContent = 'Search On';
            searchEnginesContainer.classList.remove('active');
            searchPlatformsContainer.classList.add('active');
        } else {
            searchSwitcherButton.textContent = 'Search With';
            searchPlatformsContainer.classList.remove('active');
            searchEnginesContainer.classList.add('active');
        }
    });
    searchSwitcherWidget.addEventListener('click', (e) => {
        const button = e.target.closest('.search-option-btn');
        if (!button) return;
        const { id, type } = button.dataset;
        currentSearch = { id, type };
        localStorage.setItem('currentSearch', JSON.stringify(currentSearch));
        document.querySelectorAll('.search-option-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    });
}

function manageWelcomePopup() {
    if (!welcomePopupOverlay || !welcomeCloseButton) return;

    const welcomeShown = localStorage.getItem('welcomeShown');
    if (!welcomeShown) {
        welcomePopupOverlay.classList.remove('hidden');
        setTimeout(() => {
            welcomeCloseButton.disabled = false;
        }, 5000);
    }

    welcomeCloseButton.addEventListener('click', () => {
        welcomePopupOverlay.classList.add('hidden');
        localStorage.setItem('welcomeShown', 'true');
    });
}

function applyInitialSettings() {
    const darkMode = localStorage.getItem('darkMode') !== 'false';
    document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    setClockType(clockType);
    const todoButton = document.getElementById('todo-toggle-button');
    const appsButton = document.getElementById('apps-toggle-button');
    const showTodo = localStorage.getItem('showTodo') !== 'false';
    if (todoButton) todoButton.classList.toggle('hidden', !showTodo);
    const showApps = localStorage.getItem('showApps') !== 'false';
    if (appsButton) appsButton.classList.toggle('hidden', !showApps);
    const showShortcuts = localStorage.getItem('showShortcuts') !== 'false';
    if (shortcutsContainer) {
        shortcutsContainer.classList.toggle('hidden', !showShortcuts);
    }
    const savedBg = localStorage.getItem('backgroundImage');
    if (savedBg) {
        document.body.style.backgroundImage = `url(${savedBg})`;
    }
    const customColors = [
        { key: 'themeColor', variable: '--accent-color' },
        { key: 'custom-bg-primary', variable: '--bg-primary' },
        { key: 'custom-bg-secondary', variable: '--bg-secondary' },
        { key: 'custom-bg-tertiary', variable: '--bg-tertiary' },
        { key: 'custom-text-primary', variable: '--text-primary' },
        { key: 'custom-text-secondary', variable: '--text-secondary' },
        { key: 'custom-text-placeholder', variable: '--text-placeholder' },
        { key: 'custom-glow-color', variable: '--glow-color' }
    ];
    customColors.forEach(color => {
        const savedValue = localStorage.getItem(color.key);
        if (savedValue) {
            document.documentElement.style.setProperty(color.variable, savedValue);
        }
    });
}

function initializeCore() {
    console.log("Ditom's New Tab: Initializing Core modules...");
    applyInitialSettings();
    manageWelcomeText();
    manageWelcomePopup();
    getWeather();
    manageSearchSuggestions();
    initializeSearchSwitcher(); 
    searchForm.addEventListener('submit', handleSearchSubmit);
    loadShortcuts();
    renderShortcuts();
    updateDigitalClock(new Date());
    setInterval(() => {
        updateDigitalClock(new Date());
    }, 1000);
    animationLoop(); 
    updateGreeting();
    if (hoursElement) hoursElement.style.transitionDelay = '100ms';
    if (minutesElement) minutesElement.style.transitionDelay = '250ms';
    if (secondsElement) secondsElement.style.transitionDelay = '500ms';
    const todoButton = document.getElementById('todo-toggle-button');
    const aiButton = document.getElementById('ai-tools-toggle-button');
    const appsButton = document.getElementById('apps-toggle-button');
    const settingsButton = document.getElementById('settings-toggle-button');
    if (todoButton) todoButton.style.transitionDelay = '100ms';
    if (aiButton) aiButton.style.transitionDelay = '200ms';
    if (appsButton) appsButton.style.transitionDelay = '100ms';
    if (settingsButton) settingsButton.style.transitionDelay = '1250ms';
    if (document.getElementById('weather-widget')) document.getElementById('weather-widget').style.transitionDelay = '500ms';
    if (document.getElementById('search-form')) document.getElementById('search-form').style.transitionDelay = '600ms';
    if (document.getElementById('search-switcher-widget')) document.getElementById('search-switcher-widget').style.transitionDelay = '700ms'; 
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 100);
    document.addEventListener('settingChanged', (e) => {
        const { key, value } = e.detail;
        if (key === 'clockFormat') {
            clockFormat = value;
            updateDigitalClock(new Date());
        }
        if (key === 'clockType') {
            setClockType(value);
        }
        if (key === 'tempUnit') {
            tempUnit = value;
            getWeather();
        }
        if (key === 'showShortcuts') {
            if (shortcutsContainer) {
                shortcutsContainer.classList.toggle('hidden', !value);
            }
        }
        if (key === 'showTodo') {
            const todoButton = document.getElementById('todo-toggle-button');
            if (todoButton) todoButton.classList.toggle('hidden', !value);
        }
        if (key === 'showApps') {
            const appsButton = document.getElementById('apps-toggle-button');
            if (appsButton) appsButton.classList.toggle('hidden', !value);
        }
        if (key === 'weatherApiKey') {
            location.reload();
        }
    });
}

document.addEventListener('DOMContentLoaded', initializeCore);

// script.js (Ditom Baroi Antu)