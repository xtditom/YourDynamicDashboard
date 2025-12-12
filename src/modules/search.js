// src/modules/search.js YourDynamicDashboard (Ditom Baroi Antu - 2025)

import { state } from '../state.js';
import { CONFIG, SEARCH_PROVIDERS, SEARCH_SUGGESTIONS } from '../config.js'; 

export class Search {
    constructor() {
        this.els = {
            form: document.getElementById('search-form'),
            input: document.getElementById('search-input'),
            searchBtn: document.getElementById('search-button'),
            openBtn: document.getElementById('open-site-button'),
            providerBtn: document.getElementById('search-provider-button'),
            providerIcon: document.getElementById('current-provider-icon'),
            voiceBtn: document.getElementById('voice-search-btn'),
            dropdown: document.getElementById('search-dropdown'),
            engineList: document.getElementById('dropdown-engines'),
            platformList: document.getElementById('dropdown-platforms')
        };
        
        if (!this.els.form) return;

        this.current = state.get('searchProvider') || CONFIG.defaults.searchProvider;
        this.init();
    }

    init() {
        this.renderDropdown();
        this.updateUI();
        this.updateButtons();
        this.startTypewriterEffect();

        this.els.input.addEventListener('input', () => this.updateButtons());

        this.els.providerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });

        this.els.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // --- NEW: Voice Search Logic ---
        if (this.els.voiceBtn) {
            // Check browser support
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                this.els.voiceBtn.addEventListener('click', () => this.toggleVoiceSearch());
            } else {
                this.els.voiceBtn.style.display = 'none'; // Hide if not supported
            }
        }

        document.addEventListener('click', (e) => {
            if (!this.els.dropdown.contains(e.target) && !this.els.providerBtn.contains(e.target)) {
                this.closeDropdown();
            }
        });
    }

    // --- SECTION: VOICE SEARCH ---
    toggleVoiceSearch() {
        if (this.isListening) {
            this.stopVoiceSearch();
        } else {
            this.startVoiceSearch();
        }
    }

    startVoiceSearch() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.lang = 'en-US';
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;

        this.recognition.start();
        this.isListening = true;
        this.els.voiceBtn.classList.add('listening');
        this.els.input.placeholder = "Listening...";

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.els.input.value = transcript;
            this.updateButtons(); // Show "Search" button
            
            // Optional: Auto-submit after a brief pause for effect
            setTimeout(() => {
                this.handleSubmit(new Event('submit'));
            }, 800);
        };

        this.recognition.onspeechend = () => {
            this.stopVoiceSearch();
        };

        this.recognition.onerror = (event) => {
            console.error("Voice Error:", event.error);
            this.stopVoiceSearch();
            this.els.input.placeholder = "Error. Try again.";
        };
    }

    stopVoiceSearch() {
        if (this.recognition) {
            this.recognition.stop();
        }
        this.isListening = false;
        this.els.voiceBtn.classList.remove('listening');
    }

    // --- SECTION: UI & ANIMATION ---
    startTypewriterEffect() {
        const typeSpeed = 50;   
        const deleteSpeed = 25; 
        const readDelay = 9500; 
        
        const loop = () => {
            if (this.isListening) { 
                setTimeout(loop, 1000); 
                return; 
            }

            const text = SEARCH_SUGGESTIONS[Math.floor(Math.random() * SEARCH_SUGGESTIONS.length)];
            let i = 0;
            const typing = setInterval(() => {
                if (this.isListening) { clearInterval(typing); loop(); return; }

                this.els.input.placeholder = text.substring(0, i) + '|'; 
                i++;

                if (i > text.length) {
                    clearInterval(typing);
                    this.els.input.placeholder = text; 
                    
                    setTimeout(() => {
                        let j = text.length;
                        const deleting = setInterval(() => {
                            if (this.isListening) { clearInterval(deleting); loop(); return; }
                            
                            this.els.input.placeholder = text.substring(0, j) + '|';
                            j--;

                            if (j < 0) {
                                clearInterval(deleting);
                                this.els.input.placeholder = '';
                                setTimeout(loop, 200); 
                            }
                        }, deleteSpeed);
                    }, readDelay);
                }
            }, typeSpeed);
        };
        loop();
    }

    renderDropdown() {
        const createItem = (p, type) => {
            const div = document.createElement('div');
            div.className = `dropdown-item ${p.id === this.current.id ? 'active' : ''}`;
            div.innerHTML = `<img src="${CONFIG.paths.search + p.icon}" alt="${p.name}"><span>${p.name}</span>`;
            div.addEventListener('click', () => {
                this.setProvider(p.id, type);
                this.closeDropdown(); 
            });
            return div;
        };

        this.els.engineList.innerHTML = '';
        SEARCH_PROVIDERS.engines.forEach(p => this.els.engineList.appendChild(createItem(p, 'engines')));
        
        this.els.platformList.innerHTML = '';
        SEARCH_PROVIDERS.platforms.forEach(p => this.els.platformList.appendChild(createItem(p, 'platforms')));
    }

    setProvider(id, type) {
        this.current = { id, type };
        state.set('searchProvider', this.current);
        this.updateUI();
        this.updateButtons();
        this.renderDropdown(); 
    }

    updateUI() {
        const provider = SEARCH_PROVIDERS[this.current.type].find(p => p.id === this.current.id);
        if (provider) {
            this.els.providerIcon.src = CONFIG.paths.search + provider.icon;
        }
    }

    updateButtons() {
        const hasText = this.els.input.value.trim().length > 0;
        const provider = SEARCH_PROVIDERS[this.current.type].find(p => p.id === this.current.id);

        if (hasText) {
            this.els.searchBtn.classList.remove('hidden');
            this.els.openBtn.classList.add('hidden');
        } else {
            this.els.searchBtn.classList.add('hidden');
            this.els.openBtn.classList.remove('hidden');
            
            if (provider) {
                const urlObj = new URL(provider.url);
                this.els.openBtn.href = urlObj.origin;
                this.els.openBtn.textContent = 'Open'; 
                this.els.openBtn.title = `Open ${provider.name}`;
            }
        }
    }

    toggleDropdown() {
        const isHidden = this.els.dropdown.classList.contains('hidden');
        if (isHidden) {
            this.openDropdown();
        } else {
            this.closeDropdown();
        }
    }

    openDropdown() {
        this.els.dropdown.classList.remove('hidden');
        this.els.providerBtn.classList.add('is-open');
        
        const quoteWidget = document.getElementById('quote-widget');
        if (quoteWidget) {
            quoteWidget.classList.add('visually-hidden');
        }
    }

    closeDropdown() {
        this.els.dropdown.classList.add('hidden');
        this.els.providerBtn.classList.remove('is-open');
        
        const quoteWidget = document.getElementById('quote-widget');
        if (quoteWidget) {
            quoteWidget.classList.remove('visually-hidden');
        }
    }

    handleSubmit(e) {
        if (e.preventDefault) e.preventDefault();
        const query = this.els.input.value.trim();
        if (!query) return;

        const provider = SEARCH_PROVIDERS[this.current.type].find(p => p.id === this.current.id);
        if (!provider) return;

        let url;
        if (provider.searchType === 'path') {
            url = `${provider.url}/${encodeURIComponent(query)}`;
        } else {
            url = `${provider.url}?${provider.queryParam}=${encodeURIComponent(query)}`;
        }
        
        window.location.href = url;
    }
}

// src/modules/search.js YourDynamicDashboard (Ditom Baroi Antu - 2025)