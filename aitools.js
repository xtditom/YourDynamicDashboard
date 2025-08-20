// aitools.js (Ditom Baroi Antu)

const aiToolsToggleButton = document.getElementById('ai-tools-toggle-button');
const aiToolsPopup = document.getElementById('ai-tools-popup');
const aiToolsList = document.getElementById('ai-tools-list');
const socialToolsList = document.getElementById('social-tools-list');
const toolEditButton = document.getElementById('tool-edit-button');

let hiddenTools = {};
let isEditMode = false;

const aiTools = [
    { name: 'ChatGPT', url: 'https://chat.openai.com/', icon: 'ai-tools/chatgpt.png', id: 'ai-chatgpt' },
    { name: 'Claude', url: 'https://claude.ai/new/', icon: 'ai-tools/claude.png', id: 'ai-claude' },
    { name: 'Copilot', url: 'https://copilot.microsoft.com/', icon: 'ai-tools/copilot.png', id: 'ai-copilot' },
    { name: 'DeepSeek', url: 'https://chat.deepseek.com/', icon: 'ai-tools/deepseek.png', id: 'ai-deepseek' },
    { name: 'Gemini', url: 'https://gemini.google.com/', icon: 'ai-tools/gemini.png', id: 'ai-gemini' },
    { name: 'Qwen', url: 'https://chat.qwen.ai/', icon: 'ai-tools/qwen.png', id: 'ai-qwen' },
    { name: 'Grok', url: 'https://grok.com/', icon: 'ai-tools/grok.png', id: 'ai-grok' },
    { name: 'Meta AI', url: 'https://www.meta.ai/', icon: 'ai-tools/metaai.png', id: 'ai-meta' },
    { name: 'Perplexity', url: 'https://www.perplexity.ai/', icon: 'ai-tools/perplexity.png', id: 'ai-perplexity' },
];

function renderTools(listElement, toolArray) {
    if (!listElement) return;
    listElement.innerHTML = '';
    
    const toolsToRender = isEditMode ? toolArray : toolArray.filter(tool => !hiddenTools[tool.id]);

    toolsToRender.forEach(tool => {
        const isHidden = hiddenTools[tool.id];
        const link = document.createElement('a');
        link.href = tool.url;
        link.className = 'ai-tool-item';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        
        if (isEditMode) {
            link.classList.add('edit-mode-item');
            if (isHidden) {
                link.classList.add('is-hidden');
            }
        }

        const iconDiv = document.createElement('div');
        iconDiv.className = 'ai-tool-icon';

        const iconImg = document.createElement('img');
        iconImg.src = tool.icon;
        iconImg.alt = tool.name;

        const name = document.createElement('span');
        name.textContent = tool.name;
        
        if (isEditMode) {
            const editOverlay = document.createElement('div');
            editOverlay.className = 'edit-overlay';
            editOverlay.dataset.toolId = tool.id;
            
            const icon = document.createElement('div');
            icon.className = isHidden ? 'icon-add' : 'icon-remove';
            icon.innerHTML = isHidden ? '+' : '&times;';
            
            editOverlay.appendChild(icon);
            link.appendChild(editOverlay);
        }

        iconDiv.appendChild(iconImg);
        link.appendChild(iconDiv);
        link.appendChild(name);
        
        listElement.appendChild(link);
    });
}

function saveHiddenTools() {
    localStorage.setItem('hiddenTools', JSON.stringify(hiddenTools));
}

function loadHiddenTools() {
    const saved = localStorage.getItem('hiddenTools');
    hiddenTools = saved ? JSON.parse(saved) : {};
}

function switchToolTab(tab) {
    const aiTabButton = document.querySelector('.tool-tab-button[data-tab="ai"]');
    const socialTabButton = document.querySelector('.tool-tab-button[data-tab="social"]');
    const aiIcon = aiToolsToggleButton.querySelector('.ai-icon');
    const socialIcon = aiToolsToggleButton.querySelector('.social-icon');

    if (tab === 'social') {
        aiTabButton.classList.remove('active');
        socialTabButton.classList.add('active');
        aiToolsList.classList.remove('active');
        socialToolsList.classList.add('active');
        aiIcon.classList.add('hidden');
        socialIcon.classList.remove('hidden');
        localStorage.setItem('activeToolTab', 'social');
    } else { // Default to AI
        socialTabButton.classList.remove('active');
        aiTabButton.classList.add('active');
        socialToolsList.classList.remove('active');
        aiToolsList.classList.add('active');
        socialIcon.classList.add('hidden');
        aiIcon.classList.remove('hidden');
        localStorage.setItem('activeToolTab', 'ai');
    }
}

function manageAiToolsEvents() {
    if (!aiToolsToggleButton || !aiToolsPopup) return;

    aiToolsToggleButton.addEventListener('click', (event) => {
        event.stopPropagation();
        aiToolsPopup.classList.toggle('visible');
        aiToolsToggleButton.classList.add('animating');
        setTimeout(() => aiToolsToggleButton.classList.remove('animating'), 400);
    });

    document.addEventListener('click', (event) => {
        if (aiToolsPopup.classList.contains('visible') && !aiToolsPopup.contains(event.target)) {
            aiToolsPopup.classList.remove('visible');
            if (isEditMode) { // Exit edit mode if clicking outside
                isEditMode = false;
                aiToolsPopup.classList.remove('edit-mode');
                toolEditButton.querySelector('.icon-pencil').classList.remove('hidden');
                toolEditButton.querySelector('.icon-check').classList.add('hidden');
                renderTools(aiToolsList, aiTools);
                renderTools(socialToolsList, socialMediaLinks);
            }
        }
    });

    aiToolsPopup.addEventListener('click', (event) => {
        const tabButton = event.target.closest('.tool-tab-button');
        if (tabButton) {
            event.stopPropagation();
            switchToolTab(tabButton.dataset.tab);
        }

        const overlay = event.target.closest('.edit-overlay');
        if (isEditMode && overlay) {
            event.preventDefault(); // <-- FIX for the click-through bug
            event.stopPropagation();
            const toolId = overlay.dataset.toolId;
            hiddenTools[toolId] = !hiddenTools[toolId];
            saveHiddenTools();
            renderTools(aiToolsList, aiTools);
            renderTools(socialToolsList, socialMediaLinks);
        }
    });

    toolEditButton.addEventListener('click', (event) => {
        event.stopPropagation();
        isEditMode = !isEditMode;
        aiToolsPopup.classList.toggle('edit-mode', isEditMode);
        toolEditButton.querySelector('.icon-pencil').classList.toggle('hidden', isEditMode);
        toolEditButton.querySelector('.icon-check').classList.toggle('hidden', !isEditMode);
        renderTools(aiToolsList, aiTools);
        renderTools(socialToolsList, socialMediaLinks);
    });

    document.addEventListener('settingChanged', (e) => {
        if (e.detail.key === 'showAiTools') {
            aiToolsToggleButton.classList.toggle('hidden', !e.detail.value);
        }
    });
}

function initializeAiToolsModule() {
    console.log("AI & Social Tools module loaded.");
    loadHiddenTools();
    
    const showAiTools = localStorage.getItem('showAiTools') !== 'false';
    if (aiToolsToggleButton) {
        aiToolsToggleButton.classList.toggle('hidden', !showAiTools);
    }

    renderTools(aiToolsList, aiTools);
    renderTools(socialToolsList, socialMediaLinks);
    manageAiToolsEvents();

    const lastTab = localStorage.getItem('activeToolTab') || 'ai';
    switchToolTab(lastTab);
}

document.addEventListener('DOMContentLoaded', initializeAiToolsModule);
