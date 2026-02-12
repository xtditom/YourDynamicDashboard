// src/modules/shortcuts.js YourDynamicDashboard (Ditom Baroi Antu - 2025-26)

import { state } from '../state.js';
import { getIconUrl } from '../utils.js';

export class Shortcuts {
    constructor() {
        this.container = document.getElementById('shortcuts-container');
        this.defaults = [
            { name: 'YouTube', url: 'https://www.youtube.com' },
            { name: 'LinkedIn', url: 'https://www.linkedin.com/' },
            { name: 'Wikipedia', url: 'https://www.wikipedia.org' },
            { name: 'Facebook', url: 'https://www.facebook.com' },
            { name: 'Amazon', url: 'https://www.amazon.com' }
        ];

        this.init();
    }

    init() {
        // Check if shortcuts exist in state. If null/undefined, set defaults.
        const current = state.get('userShortcuts');
        
        if (!current || !Array.isArray(current)) {
            const withIcons = this.defaults.map(s => ({...s, icon: getIconUrl(s.url)}));
            state.set('userShortcuts', withIcons);
        }

        this.render();

        state.subscribe((key) => {
            if (key === 'userShortcuts') {
                this.render();
            }
            if (key === 'showShortcuts') this.updateVisibility();
        });
        
        this.updateVisibility();
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';
        
        const shortcuts = state.get('userShortcuts') || [];
        
        shortcuts.forEach((shortcut, index) => {
            const link = document.createElement('a');
            link.href = shortcut.url;
            link.className = 'shortcut-item';
            link.style.transitionDelay = `${index * 50}ms`; 
            
            const iconDiv = document.createElement('div');
            iconDiv.className = 'shortcut-icon';
            
            const img = document.createElement('img');
            img.src = shortcut.icon || getIconUrl(shortcut.url);
            img.alt = shortcut.name;
            img.onerror = () => {
                img.style.display = 'none';
                const span = document.createElement('span');
                span.className = 'shortcut-fallback-text';
                span.textContent = shortcut.name.charAt(0).toUpperCase();
                iconDiv.appendChild(span);
            };

            const label = document.createElement('span');
            label.className = 'shortcut-label';
            label.textContent = shortcut.name;

            iconDiv.appendChild(img);
            link.appendChild(iconDiv);
            link.appendChild(label);
            this.container.appendChild(link);
        });
    }

    updateVisibility() {
        const show = state.get('showShortcuts');
        if (this.container) this.container.classList.toggle('hidden', !show);
    }
}

// src/modules/shortcuts.js YourDynamicDashboard (Ditom Baroi Antu - 2025-26)