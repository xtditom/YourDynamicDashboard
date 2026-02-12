// src/utils.js YourDynamicDashboard (Ditom Baroi Antu - 2025-26)

export function formatTime(number) {
    return String(number).padStart(2, '0');
}

export function getIconUrl(url) {
    try {
        const urlObject = new URL(url);
        // Use Google's favicon service for reliable icons
        return `https://www.google.com/s2/favicons?sz=64&domain=${urlObject.hostname}`;
    } catch (e) {
        return 'assets/icons/default.png'; 
    }
}

export function createEl(tag, className, text = '') {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
}

// src/utils.js YourDynamicDashboard (Ditom Baroi Antu - 2025-26)