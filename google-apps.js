// google-apps.js (Ditom Baroi Antu)

const appsToggleButton = document.getElementById('apps-toggle-button');
const appsPopup = document.getElementById('apps-popup');
const appsGrid = document.getElementById('apps-grid');

const googleApps = [
    { name: 'Account', url: 'https://myaccount.google.com/', icon: 'G Apps/account.png' },
    { name: 'Google', url: 'https://www.google.com/', icon: 'G Apps/google.png' },
    { name: 'YouTube', url: 'https://www.youtube.com/', icon: 'G Apps/yt.png' },
    { name: 'Gmail', url: 'https://mail.google.com/', icon: 'G Apps/gmail.png' },
    { name: 'YT Music', url: 'https://music.youtube.com/', icon: 'G Apps/ytmusic.png' },
    { name: 'Maps', url: 'https://maps.google.com/', icon: 'G Apps/maps.png' },
    { name: 'Play', url: 'https://play.google.com/', icon: 'G Apps/play.png' },
    { name: 'Drive', url: 'https://drive.google.com/', icon: 'G Apps/drive.png' },
    { name: 'Photos', url: 'https://photos.google.com/', icon: 'G Apps/photos.png' },
    { name: 'Translate', url: 'https://translate.google.com/', icon: 'G Apps/translate.png' },
    { name: 'Calendar', url: 'https://calendar.google.com/', icon: 'G Apps/calendar.png' },
    { name: 'Meet', url: 'https://meet.google.com/', icon: 'G Apps/meet.png' },
    { name: 'Chat', url: 'https://chat.google.com/', icon: 'G Apps/chat.png' },
    { name: 'News', url: 'https://news.google.com/', icon: 'G Apps/news.png' },
    { name: 'Contacts', url: 'https://contacts.google.com/', icon: 'G Apps/contact.png' },
    { name: 'divider' },
    { name: 'Docs', url: 'https://docs.google.com/', icon: 'G Apps/docs.png' },
    { name: 'Sheets', url: 'https://sheets.google.com/', icon: 'G Apps/sheets.png' },
    { name: 'Slides', url: 'https://slides.google.com/', icon: 'G Apps/slides.png' },
    { name: 'Google One', url: 'https://one.google.com/', icon: 'G Apps/one.png' },
    { name: 'Keep', url: 'https://keep.google.com/', icon: 'G Apps/keep.png' },
    { name: 'Passwords', url: 'https://passwords.google.com/', icon: 'G Apps/password.png' },
    { name: 'Classroom', url: 'https://classroom.google.com/', icon: 'G Apps/classroom.png' },
    { name: 'Blogger', url: 'https://www.blogger.com/', icon: 'G Apps/blogger.png' },
    { name: 'Earth', url: 'https://earth.google.com/', icon: 'G Apps/earth.png' },
    { name: 'Contact', url: 'https://contacts.google.com/', icon: 'G Apps/contact.png' },
    { name: 'NotebookLM', url: 'https://notebooklm.google.com/', icon: 'G Apps/notebooklm.png' },
    { name: 'Wallet', url: 'https://wallet.google/', icon: 'G Apps/wallet.png' }
];

function renderGoogleApps() {
    if (!appsGrid) return;
    appsGrid.innerHTML = ''; 

    googleApps.forEach(app => {
        if (app.name === 'divider') {
            const divider = document.createElement('div');
            divider.className = 'apps-grid-divider';
            appsGrid.appendChild(divider);
            return;
        }

        const link = document.createElement('a');
        link.href = app.url;
        link.className = 'app-item';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        const icon = document.createElement('img');
        icon.src = app.icon;
        icon.alt = app.name;
        icon.className = 'app-icon';

        const name = document.createElement('span');
        name.textContent = app.name;
        name.className = 'app-name';

        link.appendChild(icon);
        link.appendChild(name);
        appsGrid.appendChild(link);
    });
}

function manageAppsEvents() {
    if (!appsToggleButton || !appsPopup) return;

    appsToggleButton.addEventListener('click', (event) => {
        event.stopPropagation();
        appsPopup.classList.toggle('visible');
        appsToggleButton.classList.toggle('is-open');
    });

    document.addEventListener('click', (event) => {
        if (appsPopup.classList.contains('visible') && !appsPopup.contains(event.target)) {
            appsPopup.classList.remove('visible');
            appsToggleButton.classList.remove('is-open');
        }
    });

    appsPopup.addEventListener('click', (event) => {
        event.stopPropagation();
    });
}

function initializeAppsModule() {
    console.log("Google Apps module loaded.");
    renderGoogleApps();
    manageAppsEvents();
}

document.addEventListener('DOMContentLoaded', initializeAppsModule);

// google-apps.js (Ditom Baroi Antu)