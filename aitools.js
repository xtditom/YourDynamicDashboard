// aitools.js (Ditom Baroi Antu)

const aiToolsToggleButton = document.getElementById('ai-tools-toggle-button');
const aiToolsPopup = document.getElementById('ai-tools-popup');
const aiToolsList = document.getElementById('ai-tools-list');

const aiTools = [
    { name: 'ChatGPT', url: 'https://chat.openai.com/', icon: 'ai-tools/chatgpt.png' },
    { name: 'Claude', url: 'https://claude.ai/new/', icon: 'ai-tools/claude.png' },
    { name: 'Copilot', url: 'https://copilot.microsoft.com/', icon: 'ai-tools/copilot.png' },
    { name: 'DeepSeek', url: 'https://chat.deepseek.com/', icon: 'ai-tools/deepseek.png' },
    { name: 'Gemini', url: 'https://gemini.google.com/', icon: 'ai-tools/gemini.png' },
    { name: 'Qwen', url: 'https://chat.qwen.ai/', icon: 'ai-tools/qwen.png' },
    { name: 'Grok', url: 'https://grok.com/', icon: 'ai-tools/grok.png' },
    { name: 'Meta AI', url: 'https://www.meta.ai/', icon: 'ai-tools/metaai.png' },
    { name: 'Perplexity', url: 'https://www.perplexity.ai/', icon: 'ai-tools/perplexity.png' },
];

function renderAiTools() { 
    if (!aiToolsList) return;
    aiToolsList.innerHTML = '';
    aiTools.forEach(tool => {
        const link = document.createElement('a');
        link.href = tool.url;
        link.className = 'ai-tool-item';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        
        const iconDiv = document.createElement('div');
        iconDiv.className = 'ai-tool-icon';

        const iconImg = document.createElement('img');
        iconImg.src = tool.icon;
        iconImg.alt = tool.name;

        const name = document.createElement('span');
        name.textContent = tool.name;
        
        iconDiv.appendChild(iconImg);
        link.appendChild(iconDiv);
        link.appendChild(name);
        aiToolsList.appendChild(link);
    });
}

function manageAiToolsEvents() {
    if (!aiToolsToggleButton || !aiToolsPopup) return;

    aiToolsToggleButton.addEventListener('click', (event) => {
        event.stopPropagation();
        aiToolsPopup.classList.toggle('visible');

        aiToolsToggleButton.classList.add('animating');
        setTimeout(() => {
            aiToolsToggleButton.classList.remove('animating');
        }, 400);
    });

    document.addEventListener('click', (event) => {
        if (aiToolsPopup.classList.contains('visible') && !aiToolsPopup.contains(event.target)) {
            aiToolsPopup.classList.remove('visible');
        }
    });

    aiToolsPopup.addEventListener('click', (event) => {
        event.stopPropagation();
    });

    document.addEventListener('settingChanged', (e) => {
        if (e.detail.key === 'showAiTools') {
            aiToolsToggleButton.classList.toggle('hidden', !e.detail.value);
        }
    });
}

function initializeAiToolsModule() {
    console.log("AI Tools module loaded.");
    
    const showAiTools = localStorage.getItem('showAiTools') !== 'false';
    if (aiToolsToggleButton) {
        aiToolsToggleButton.classList.toggle('hidden', !showAiTools);
    }

    renderAiTools();
    manageAiToolsEvents();
}

document.addEventListener('DOMContentLoaded', initializeAiToolsModule);

// aitools.js (Ditom Baroi Antu)