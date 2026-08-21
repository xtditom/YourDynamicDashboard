import { state } from "../state.js";
import { CONFIG, QUOTES } from "../config.js";

export class QuoteWidget {
  constructor() {
    this.els = {
      widget: document.getElementById("quote-widget"),
      text: document.getElementById("quote-text"),
      author: document.getElementById("quote-author"),
      weather: document.getElementById("weather-widget"),
      search: document.getElementById("search-form"),
    };
    this._quoteTimer = null;
    this._quoteFadeTimer = null;
    this._visibilityHandler = () => this.handleVisibilityChange();
    this.init();
  }

  init() {
    this.updateText();

    // --- ANIMATED CYCLE: 12.5 Seconds (visible tabs only) ---
    document.addEventListener("visibilitychange", this._visibilityHandler);

    state.subscribe((key) => {
      if (key === "widgetControl") this.applyWidgetVisibility();
    });
    this.applyWidgetVisibility();
  }

  startQuoteTimer() {
    this.stopQuoteTimer();
    if (document.hidden || this.els.widget?.classList.contains("hidden")) return;
    this._quoteTimer = window.setInterval(() => this.cycleQuote(), 12500);
  }

  stopQuoteTimer() {
    clearInterval(this._quoteTimer);
    clearTimeout(this._quoteFadeTimer);
    this._quoteTimer = null;
    this._quoteFadeTimer = null;
    this.els.text?.classList.remove("quote-fading");
    this.els.author?.classList.remove("quote-fading");
  }

  handleVisibilityChange() {
    if (document.hidden) this.stopQuoteTimer();
    else this.startQuoteTimer();
  }

  updateText() {
    const random = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    this.els.text.textContent = `"${random.text}"`;
    this.els.author.textContent = `- ${random.author}`;
  }

  cycleQuote() {
    if (document.hidden || this.els.widget?.classList.contains("hidden")) return;
    this.els.text.classList.add("quote-fading");
    this.els.author.classList.add("quote-fading");

    clearTimeout(this._quoteFadeTimer);
    this._quoteFadeTimer = window.setTimeout(() => {
      this.updateText();
      this.els.text.classList.remove("quote-fading");
      this.els.author.classList.remove("quote-fading");
      this._quoteFadeTimer = null;
    }, 500);
  }

  applyWidgetVisibility() {
    const control = state.get("widgetControl") || "all";

    const showSearch  = ["all", "search-only", "search-weather", "search-quote"].includes(control);
    const showWeather = ["all", "weather-only", "search-weather", "weather-quote"].includes(control);
    const showQuote   = ["all", "quote-only",  "search-quote",  "weather-quote"].includes(control);

    // --- Animation assignments per mode ---
    let weatherAnim = null, searchAnim = null, quoteAnim = null;
    let searchDelay = null;
    switch (control) {
      case "all":
        weatherAnim = "fade-down";
        searchAnim  = "popup-scale-entry";
        quoteAnim   = "fade-up";
        break;
      case "weather-only":
        weatherAnim = "popup-scale-entry";
        break;
      case "search-only":
        searchAnim = "popup-scale-entry";
        break;
      case "quote-only":
        quoteAnim = "popup-scale-entry";
        break;
      case "search-weather":
        searchAnim  = "popup-scale-entry";
        searchDelay = "0.22s";
        weatherAnim = "popup-scale-entry";
        break;
      case "search-quote":
        searchAnim  = "popup-scale-entry";
        searchDelay = "0.22s";
        quoteAnim   = "popup-scale-entry";
        break;
      case "weather-quote":
        weatherAnim = "fade-down";
        quoteAnim   = "fade-up";  
        break;
    }

    const animate = (el, animClass, inlineDelay = null) => {
      if (!el) return;
      el.classList.remove("fade-up", "fade-down", "popup-scale-entry");
      el.style.animationDelay = inlineDelay || "";
      void el.offsetWidth;
      if (animClass) el.classList.add(animClass);
    };

    if (this.els.search) {
      if (showSearch) {
        this.els.search.classList.remove("hidden");
        animate(this.els.search, searchAnim, searchDelay);
      } else {
        this.els.search.classList.add("hidden");
        this.els.search.style.animationDelay = "";
        this.els.search.classList.remove("fade-up", "fade-down", "popup-scale-entry");
      }
    }

    if (this.els.weather) {
      if (showWeather) {
        this.els.weather.classList.remove("hidden");
        animate(this.els.weather, weatherAnim);
      } else {
        this.els.weather.classList.add("hidden");
        this.els.weather.classList.remove("fade-up", "fade-down", "popup-scale-entry");
      }
    }

    if (this.els.widget) {
      if (showQuote) {
        this.els.widget.classList.remove("hidden");
        animate(this.els.widget, quoteAnim);
      } else {
        this.els.widget.classList.add("hidden");
        this.els.widget.classList.remove("fade-up", "fade-down", "popup-scale-entry");
      }
    }

    document.body.classList.toggle("widgets-hidden", control === "nothing");
    this.startQuoteTimer();
  }
}
// [src/modules/quotes.js] YourDynamicDashboard V3.0.0 (Ditom Baroi Antu - 2025-26)
