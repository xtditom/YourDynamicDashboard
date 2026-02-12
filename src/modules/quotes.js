// src/modules/quotes.js YourDynamicDashboard (Ditom Baroi Antu - 2025-26)

import { state } from '../state.js';
import { CONFIG, QUOTES } from '../config.js';

export class QuoteWidget {
    constructor() {
        this.els = {
            widget: document.getElementById('quote-widget'),
            text: document.getElementById('quote-text'),
            author: document.getElementById('quote-author'),
            weather: document.getElementById('weather-widget'),
            rightCol: document.querySelector('.column-right')
        };
        this.init();
    }

    init() {
        // Initial render (Instant, no fade needed for first load)
        this.updateText(); 
        
        // --- ANIMATED CYCLE: 12.5 Seconds ---
        setInterval(() => this.cycleQuote(), 12500);

        state.subscribe((key) => {
            if (key === 'quotePosition') this.updatePosition();
        });
        this.updatePosition();
    }

    // Helper to just get a random quote and set it
    updateText() {
        const random = QUOTES[Math.floor(Math.random() * QUOTES.length)];
        this.els.text.textContent = `"${random.text}"`;
        this.els.author.textContent = `- ${random.author}`;
    }

    // New method: Handles the Animation + Update
    cycleQuote() {
        // 1. Fade Out
        this.els.text.classList.add('quote-fading');
        this.els.author.classList.add('quote-fading');

        // 2. Wait 500ms (matches CSS transition)
        setTimeout(() => {
            this.updateText(); // Change content while invisible

            // 3. Fade In
            this.els.text.classList.remove('quote-fading');
            this.els.author.classList.remove('quote-fading');
        }, 500);
    }

    updatePosition() {
        const pos = state.get('quotePosition');
        
        this.els.widget.classList.add('hidden');
        this.els.widget.classList.remove('fade-up', 'fade-down');
        if (this.els.weather) this.els.weather.classList.remove('hidden');

        if (pos === 'off') return;

        this.els.widget.classList.remove('hidden');
        
        if (pos === 'replace') {
            if (this.els.weather) this.els.weather.classList.add('hidden');
            this.els.rightCol.insertBefore(this.els.widget, this.els.rightCol.firstChild);
            this.els.widget.classList.add('fade-down');
        } else {
            this.els.rightCol.appendChild(this.els.widget);
            this.els.widget.classList.add('fade-up');
        }
    }
}

// src/modules/quotes.js YourDynamicDashboard (Ditom Baroi Antu - 2025-26)