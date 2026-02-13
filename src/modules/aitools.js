// src/modules/aitools.js YourDynamicDashboard (Ditom Baroi Antu - 2025-26)

import { CONFIG, AI_TOOLS, SOCIAL_LINKS } from '../config.js';
import { state } from '../state.js';

export class AiTools {
    constructor() {
        this.els = {
            btn: document.getElementById('ai-tools-toggle-button'),
            popup: document.getElementById('ai-tools-popup'),
            aiList: document.getElementById('ai-tools-list'),
            socialList: document.getElementById('social-tools-list'),
            tabs: document.querySelectorAll('.tool-tab-button'),
            editBtn: document.getElementById('tool-edit-button')
        };
        
        if (!this.els.btn) return;
        
        this.activeTab = localStorage.getItem('activeToolTab') || 'ai';
        this.isEditMode = false;
        this.hiddenTools = state.get('hiddenTools') || {};
        
        this.init();
    }

    init() {
        this.renderAll();

        // Main Toggle with ANIMATION
        this.els.btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
            
            // --- ANIMATION FIX ---
            this.els.btn.classList.add('animating');
            setTimeout(() => this.els.btn.classList.remove('animating'), 400);
        });

        // Edit Button
        this.els.editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleEditMode();
        });

        // Tab Switching
        this.els.tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.stopPropagation();
                this.switchTab(tab.dataset.tab);
            });
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this.els.popup.classList.contains('visible') && !this.els.popup.contains(e.target)) {
                this.close();
            }
        });

        this.els.popup.addEventListener('click', (e) => e.stopPropagation());

        state.subscribe((key) => {
            if (key === 'showAiTools') this.updateVisibility();
        });
        this.updateVisibility();
    }

    toggle() {
        this.els.popup.classList.toggle('visible');
    }

    close() {
        this.els.popup.classList.remove('visible');
        if (this.isEditMode) this.toggleEditMode(); // Exit edit mode on close
    }

    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        this.els.popup.classList.toggle('edit-mode', this.isEditMode);
        
        const pencil = this.els.editBtn.querySelector('.icon-pencil');
        const check = this.els.editBtn.querySelector('.icon-check');
        
        if (pencil) pencil.classList.toggle('hidden', this.isEditMode);
        if (check) check.classList.toggle('hidden', !this.isEditMode);
        
        this.renderAll();
    }

    switchTab(tabName) {
        this.activeTab = tabName;
        localStorage.setItem('activeToolTab', tabName);

        this.els.tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
        
        if (tabName === 'ai') {
            this.els.aiList.classList.add('active');
            this.els.socialList.classList.remove('active');
            // Toggle icon in main button
            this.els.btn.querySelector('.ai-icon').classList.remove('hidden');
            this.els.btn.querySelector('.social-icon').classList.add('hidden');
        } else {
            this.els.aiList.classList.remove('active');
            this.els.socialList.classList.add('active');
            // Toggle icon in main button
            this.els.btn.querySelector('.ai-icon').classList.add('hidden');
            this.els.btn.querySelector('.social-icon').classList.remove('hidden');
        }
    }

    renderAll() {
        this.renderList(this.els.aiList, AI_TOOLS, CONFIG.paths.ai);
        this.renderList(this.els.socialList, SOCIAL_LINKS, CONFIG.paths.social);
    }

    renderList(container, items, pathPrefix) {
        container.innerHTML = '';
        
        // In normal mode, filter out hidden tools. In edit mode, show everything.
        const toolsToRender = this.isEditMode ? items : items.filter(t => !this.hiddenTools[t.id]);

        toolsToRender.forEach(tool => {
            const isHidden = this.hiddenTools[tool.id];
            
            const a = document.createElement('a');
            a.className = 'ai-tool-item';
            a.href = this.isEditMode ? '#' : tool.url; // Disable link in edit mode
            if (!this.isEditMode) a.target = '_blank';
            
            if (this.isEditMode) {
                a.classList.add('edit-mode-item');
                if (isHidden) a.classList.add('is-hidden');
            }

            const iconDiv = document.createElement('div');
            iconDiv.className = 'ai-tool-icon';
            const img = document.createElement('img');
            img.src = pathPrefix + tool.icon;
            
            // Edit Overlay
            if (this.isEditMode) {
                const overlay = document.createElement('div');
                overlay.className = 'edit-overlay';
                
                const span = document.createElement('span');
                span.className = isHidden ? 'icon-add' : 'icon-remove';
                span.textContent = isHidden ? '+' : '×';
                overlay.appendChild(span);
                
                // Toggle Hidden Logic
                overlay.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleToolVisibility(tool.id);
                });
                a.appendChild(overlay);
            }
            
            iconDiv.appendChild(img);
            a.appendChild(iconDiv);
            a.appendChild(document.createTextNode(tool.name));
            
            container.appendChild(a);
        });
    }

    toggleToolVisibility(id) {
        if (this.hiddenTools[id]) {
            delete this.hiddenTools[id];
        } else {
            this.hiddenTools[id] = true;
        }
        state.set('hiddenTools', this.hiddenTools);
        this.renderAll();
    }

    updateVisibility() {
        const show = state.get('showAiTools');
        this.els.btn.classList.toggle('hidden', !show);
    }
}

// src/modules/aitools.js YourDynamicDashboard (Ditom Baroi Antu - 2025-26)