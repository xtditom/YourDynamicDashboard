// src/config.js YourDynamicDashboard (Ditom Baroi Antu - 2025-26)
// Central Repository for all static data - FULL VERSION

export const CONFIG = {
    defaults: {
        clockFormat: '12',
        clockType: 'digital',
        tempUnit: 'metric',
        quotePosition: 'below',
        showTodo: true,
        showApps: true,
        showShortcuts: true,
        showAiTools: true,
        welcomeText: 'Click to edit',
        searchProvider: { id: 'google', type: 'engines' },
        hiddenTools: {},
        autoTheme: false,
        darkMode: true, // Default to Dark Mode
        normalThemeId: 'default-dark'
    },
    paths: {
        icons: 'assets/icons/',
        search: 'assets/search-tools/',
        apps: 'assets/google-apps/',
        ai: 'assets/ai-tools/',
        social: 'assets/socials/'
    }
};

export const QUOTES = [
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Code is like humor. When you have to explain it, it’s bad.", author: "Cory House" },
    { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
    { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
    { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
    { text: "Perfection is achieved not when there is nothing more to add, but rather when there is nothing more to take away.", author: "Antoine de Saint-Exupéry" },
    { text: "It is better to be a warrior in a garden, than a gardener in a war.", author: "Miyamoto Musashi" },
    { text: "We suffer more often in imagination than in reality.", author: "Seneca" },
    { text: "Discipline equals freedom.", author: "Jocko Willink" },
    { text: "The obstacle is the way.", author: "Ryan Holiday" },
    { text: "You have the right to work, but never to the fruit of work.", author: "Shree Krishna" },
    { text: "Change is the law of the universe.", author: "Shree Krishna" },
    { text: "Man is made by his belief. As he believes, so he is.", author: "Shree Krishna" },
    { text: "Nature does not hurry, yet everything is accomplished.", author: "Lao Tzu" },
    { text: "Arise, awake, and stop not till the goal is reached.", author: "Swami Vivekananda" },
    { text: "Your ego is your soul's worst enemy.", author: "Rusty Eric" },
    { text: "If you are going through hell, keep going.", author: "Winston Churchill" },
    { text: "Happiness depends upon ourselves.", author: "Aristotle" },
    { text: "Knowledge is power.", author: "Francis Bacon" }
];

export const GOOGLE_APPS = [
    { name: 'Account', url: 'https://myaccount.google.com/', icon: 'account.png' },
    { name: 'Google', url: 'https://www.google.com/', icon: 'google.png' },
    { name: 'YouTube', url: 'https://www.youtube.com/', icon: 'yt.png' },
    { name: 'Gmail', url: 'https://mail.google.com/', icon: 'gmail.png' },
    { name: 'YT Music', url: 'https://music.youtube.com/', icon: 'ytmusic.png' },
    { name: 'Maps', url: 'https://maps.google.com/', icon: 'maps.png' },
    { name: 'Play', url: 'https://play.google.com/', icon: 'play.png' },
    { name: 'Drive', url: 'https://drive.google.com/', icon: 'drive.png' },
    { name: 'Photos', url: 'https://photos.google.com/', icon: 'photos.png' },
    { name: 'Translate', url: 'https://translate.google.com/', icon: 'translate.png' },
    { name: 'Calendar', url: 'https://calendar.google.com/', icon: 'calendar.png' },
    { name: 'Meet', url: 'https://meet.google.com/', icon: 'meet.png' },
    { name: 'Chat', url: 'https://chat.google.com/', icon: 'chat.png' },
    { name: 'News', url: 'https://news.google.com/', icon: 'news.png' },
    { name: 'Contacts', url: 'https://contacts.google.com/', icon: 'contact.png' },
    { name: 'divider' },
    { name: 'Docs', url: 'https://docs.google.com/', icon: 'docs.png' },
    { name: 'Sheets', url: 'https://sheets.google.com/', icon: 'sheets.png' },
    { name: 'Slides', url: 'https://slides.google.com/', icon: 'slides.png' },
    { name: 'Google One', url: 'https://one.google.com/', icon: 'one.png' },
    { name: 'Keep', url: 'https://keep.google.com/', icon: 'keep.png' },
    { name: 'Passwords', url: 'https://passwords.google.com/', icon: 'password.png' },
    { name: 'Classroom', url: 'https://classroom.google.com/', icon: 'classroom.png' },
    { name: 'Blogger', url: 'https://www.blogger.com/', icon: 'blogger.png' },
    { name: 'Earth', url: 'https://earth.google.com/', icon: 'earth.png' },
    { name: 'WebStore', url: 'https://chromewebstore.google.com/', icon: 'store.png' },
    { name: 'NotebookLM', url: 'https://notebooklm.google.com/', icon: 'notebooklm.png' },
    { name: 'Wallet', url: 'https://wallet.google/', icon: 'wallet.png' }
];

export const AI_TOOLS = [
    { name: 'ChatGPT', url: 'https://chat.openai.com/', icon: 'chatgpt.png', id: 'ai-chatgpt' },
    { name: 'Claude', url: 'https://claude.ai/new/', icon: 'claude.png', id: 'ai-claude' },
    { name: 'Copilot', url: 'https://copilot.microsoft.com/', icon: 'copilot.png', id: 'ai-copilot' },
    { name: 'DeepSeek', url: 'https://chat.deepseek.com/', icon: 'deepseek.png', id: 'ai-deepseek' },
    { name: 'Gemini', url: 'https://gemini.google.com/', icon: 'gemini.png', id: 'ai-gemini' },
    { name: 'Qwen', url: 'https://chat.qwen.ai/', icon: 'qwen.png', id: 'ai-qwen' },
    { name: 'Grok', url: 'https://grok.com/', icon: 'grok.png', id: 'ai-grok' },
    { name: 'Meta AI', url: 'https://www.meta.ai/', icon: 'metaai.png', id: 'ai-meta' },
    { name: 'Perplexity', url: 'https://www.perplexity.ai/', icon: 'perplexity.png', id: 'ai-perplexity' }
];

export const SOCIAL_LINKS = [
    { name: 'Facebook', url: 'https://www.facebook.com/', icon: 'fb.png', id: 'social-facebook' },
    { name: 'Instagram', url: 'https://www.instagram.com/', icon: 'insta.png', id: 'social-instagram' },
    { name: 'X (Twitter)', url: 'https://www.twitter.com/', icon: 'x.png', id: 'social-x' },
    { name: 'WhatsApp', url: 'https://web.whatsapp.com/', icon: 'wa.png', id: 'social-whatsapp' },
    { name: 'Discord', url: 'https://discord.com/app', icon: 'dc.png', id: 'social-discord' },
    { name: 'Messenger', url: 'https://www.messenger.com/', icon: 'messenger.png', id: 'social-messenger' },
    { name: 'Snapchat', url: 'https://web.snapchat.com/', icon: 'sc.png', id: 'social-snapchat' },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/', icon: 'ln.png', id: 'social-linkedin' },
    { name: 'Telegram', url: 'https://web.telegram.org/', icon: 'tg.png', id: 'social-telegram' }
];

export const SEARCH_PROVIDERS = {
    engines: [
        { id: 'google', name: 'Google', url: 'https://www.google.com/search', queryParam: 'q', icon: 'google.png' },
        { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search', queryParam: 'q', icon: 'bing.png' },
        { id: 'yahoo', name: 'Yahoo', url: 'https://search.yahoo.com/search', queryParam: 'p', icon: 'yahoo.png' },
        { id: 'brave', name: 'Brave', url: 'https://search.brave.com/search', queryParam: 'q', icon: 'brave.png' },
        { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/', queryParam: 'q', icon: 'duckduckgo.png' },
        { id: 'yandex', name: 'Yandex', url: 'https://yandex.com/search/', queryParam: 'text', icon: 'yandex.png' }
    ],
    platforms: [
        { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com/results', queryParam: 'search_query', icon: 'youtube.png' },
        { id: 'spotify', name: 'Spotify', url: 'https://open.spotify.com/search', queryParam: '', searchType: 'path', icon: 'spotify.png' },
        { id: 'wikipedia', name: 'Wikipedia', url: 'https://en.wikipedia.org/w/index.php', queryParam: 'search', icon: 'wikipedia.png' },
        { id: 'pinterest', name: 'Pinterest', url: 'https://www.pinterest.com/search/pins/', queryParam: 'q', icon: 'pinterest.png' },
        { id: 'reddit', name: 'Reddit', url: 'https://www.reddit.com/search/', queryParam: 'q', icon: 'reddit.png' },
        { id: 'quora', name: 'Quora', url: 'https://www.quora.com/search', queryParam: 'q', icon: 'quora.png' }
    ]
};

export const SEARCH_SUGGESTIONS = [
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
    'How to be more confident', 'History of the internet', 'Top AI tools for productivity', 'Latest breakthroughs in fusion energy',
    'How to protect data privacy online', 'Future of remote work trends', 'Quantum computing explained simply',
    'Best coding languages for AI development', 'SpaceX Starship mission updates',
    'Impact of automation on the economy', 'Sustainable living tips for beginners',
    'Web 3.0 and the future of the internet', 'Advances in CRISPR gene editing', 'Top cybersecurity threats in 2026',
    'How to build a personal knowledge base', 'Electric vehicle battery tech news', 'Ethical implications of AGI',
    'Digital nomad visa requirements', 'Future of vertical farming', 'Best open source LLMs to try',
    'Timeline for Mars colonization', 'Augmented Reality glasses reviews', 'How to detect AI generated text',
    'Career skills for the AI era', 'Renewable energy investment trends', 'Psychology of social media addiction',
    'Latest James Webb Telescope images', 'Neuralink and brain-computer interfaces', 'Guide to self-hosting cloud services',
    'The state of the Metaverse today', 'Biohacking tips for longevity', 'How LLMs are changing software engineering'
];

// DEFAULT SHORTCUTS
export const DEFAULT_KEY_MAP = {
    todo: { key: 't', enabled: true },
    ai: { key: 'a', enabled: true },
    apps: { key: 'g', enabled: true },
    settings: { key: 's', enabled: true },
    search: { key: '/', enabled: true },
    clock: { key: 'c', enabled: false },
    date: { key: 'd', enabled: false },
    autoTheme: { key: 'e', enabled: false }
};

// src/config.js YourDynamicDashboard (Ditom Baroi Antu - 2025-26)