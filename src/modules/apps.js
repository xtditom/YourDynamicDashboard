// src/modules/apps.js YourDynamicDashboard (Ditom Baroi Antu - 2025)

import { CONFIG, GOOGLE_APPS } from '../config.js';
import { state } from '../state.js';

export class AppGrid {
    constructor() {
        this.els = {
            btn: document.getElementById('apps-toggle-button'),
            popup: document.getElementById('apps-popup'),
            grid: document.getElementById('apps-grid')
        };
        
        if (!this.els.btn) return;
        this.init();
    }

    init() {
        this.render();
        
        this.els.btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        document.addEventListener('click', (e) => {
            if (this.els.popup.classList.contains('visible') && !this.els.popup.contains(e.target)) {
                this.close();
            }
        });

        this.els.popup.addEventListener('click', (e) => e.stopPropagation());

        state.subscribe((key) => {
            if (key === 'showApps') this.updateVisibility();
        });
        this.updateVisibility();
    }

    toggle() {
        this.els.popup.classList.toggle('visible');
        this.els.btn.classList.toggle('is-open');
    }

    close() {
        this.els.popup.classList.remove('visible');
        this.els.btn.classList.remove('is-open');
    }

    render() {
        this.els.grid.innerHTML = '';
        
        GOOGLE_APPS.forEach(app => {
            if (app.name === 'divider') {
                const div = document.createElement('div');
                div.className = 'apps-grid-divider';
                this.els.grid.appendChild(div);
                return;
            }

            const a = document.createElement('a');
            a.className = 'app-item';
            a.href = app.url;
            a.target = '_blank';
            
            const img = document.createElement('img');
            img.className = 'app-icon';
            // Note: We use CONFIG.paths.apps to get the correct folder
            img.src = CONFIG.paths.apps + app.icon; 
            img.alt = app.name;
            
            const span = document.createElement('span');
            span.className = 'app-name';
            span.textContent = app.name;
            
            a.appendChild(img);
            a.appendChild(span);
            this.els.grid.appendChild(a);
        });
    }

    updateVisibility() {
        const show = state.get('showApps');
        this.els.btn.classList.toggle('hidden', !show);
    }
}

// src/modules/apps.js YourDynamicDashboard (Ditom Baroi Antu - 2025)