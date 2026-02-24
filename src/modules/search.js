import { state } from "../state.js";
import { CONFIG, SEARCH_PROVIDERS, SEARCH_SUGGESTIONS } from "../config.js";
import { showCustomModal } from "../utils.js";

export class Search {
  constructor() {
    this.els = {
      form: document.getElementById("search-form"),
      input: document.getElementById("search-input"),
      searchBtn: document.getElementById("search-button"),
      openBtn: document.getElementById("open-site-button"),
      providerBtn: document.getElementById("search-provider-button"),
      providerIcon: document.getElementById("current-provider-icon"),
      voiceBtn: document.getElementById("voice-search-btn"),
      dropdown: document.getElementById("search-dropdown"),
      engineList: document.getElementById("dropdown-engines"),
      platformList: document.getElementById("dropdown-platforms"),
    };

    if (!this.els.form) return;

    this.current =
      state.get("searchProvider") || CONFIG.defaults.searchProvider;
    this.init();
  }

  init() {
    this.renderDropdown();
    this.updateUI();
    this.updateButtons();
    this.startTypewriterEffect();

    state.subscribe((key) => {
      if (key === "linkTargets") this.updateButtons();
    });

    this.els.input.addEventListener("input", () => this.updateButtons());

    this.els.providerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    this.els.form.addEventListener("submit", (e) => this.handleSubmit(e));

    // --- NEW: Voice Search Logic ---
    if (this.els.voiceBtn) {
      if (state.get("hideVoiceSearch") === true) {
        this.els.voiceBtn.style.display = "none";
      } else if (
        "webkitSpeechRecognition" in window ||
        "SpeechRecognition" in window
      ) {
        this.els.voiceBtn.addEventListener("click", () =>
          this.toggleVoiceSearch(),
        );
      } else {
        this.els.voiceBtn.style.display = "none";
      }
    }

    document.addEventListener("click", (e) => {
      if (
        !this.els.dropdown.contains(e.target) &&
        !this.els.providerBtn.contains(e.target)
      ) {
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
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    this.recognition.lang = "en-US";
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.start();
    this.isListening = true;
    this.els.voiceBtn.classList.add("listening");
    this.els.input.placeholder = "Listening...";

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      this.els.input.value = transcript;
      this.updateButtons();

      setTimeout(() => {
        this.handleSubmit(new Event("submit"));
      }, 800);
    };

    this.recognition.onspeechend = () => {
      this.stopVoiceSearch();
    };

    this.recognition.onerror = (event) => {
      const voiceBtn = document.getElementById("voice-search-btn");
      if (voiceBtn) {
        voiceBtn.classList.remove("listening");
      }

      if (event.error === "network" || event.error === "not-allowed") {
        showCustomModal(
          "Voice Search failed: Your browser (like Brave) is blocking the audio connection for privacy reasons. You can also hide Voice Search",
          false,
          false,
          [
            {
              text: "Hide Forever",
              value: "hide",
              width: "120px",
              style:
                "background-color: var(--bg-interactive); color: var(--text-primary);",
            },
            { text: "Try again", value: "ok", width: "120px" },
          ],
        ).then((result) => {
          if (result === "hide" && voiceBtn) {
            voiceBtn.style.display = "none";
            state.set("hideVoiceSearch", true);
          }
        });
      } else {
        console.warn(event.error);
      }

      this.stopVoiceSearch();
      this.els.input.placeholder = "Error. Try again.";
    };
  }

  stopVoiceSearch() {
    if (this.recognition) {
      this.recognition.stop();
    }
    this.isListening = false;
    this.els.voiceBtn.classList.remove("listening");
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

      const text =
        SEARCH_SUGGESTIONS[
          Math.floor(Math.random() * SEARCH_SUGGESTIONS.length)
        ];
      let i = 0;
      const typing = setInterval(() => {
        if (this.isListening) {
          clearInterval(typing);
          loop();
          return;
        }

        this.els.input.placeholder = text.substring(0, i) + "|";
        i++;

        if (i > text.length) {
          clearInterval(typing);
          this.els.input.placeholder = text;

          setTimeout(() => {
            let j = text.length;
            const deleting = setInterval(() => {
              if (this.isListening) {
                clearInterval(deleting);
                loop();
                return;
              }

              this.els.input.placeholder = text.substring(0, j) + "|";
              j--;

              if (j < 0) {
                clearInterval(deleting);
                this.els.input.placeholder = "";
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
      const div = document.createElement("div");
      div.className = `dropdown-item ${p.id === this.current.id ? "active" : ""}`;

      const img = document.createElement("img");
      img.src = CONFIG.paths.search + p.icon;
      img.alt = p.name;

      const span = document.createElement("span");
      span.textContent = p.name;

      div.appendChild(img);
      div.appendChild(span);

      div.addEventListener("click", () => {
        this.setProvider(p.id, type);
        this.closeDropdown();
      });
      return div;
    };

    this.els.engineList.innerHTML = "";
    SEARCH_PROVIDERS.engines.forEach((p) =>
      this.els.engineList.appendChild(createItem(p, "engines")),
    );

    this.els.platformList.innerHTML = "";
    SEARCH_PROVIDERS.platforms.forEach((p) =>
      this.els.platformList.appendChild(createItem(p, "platforms")),
    );
  }

  setProvider(id, type) {
    this.current = { id, type };
    state.set("searchProvider", this.current);
    this.updateUI();
    this.updateButtons();
    this.renderDropdown();
  }

  updateUI() {
    const provider = SEARCH_PROVIDERS[this.current.type].find(
      (p) => p.id === this.current.id,
    );
    if (provider) {
      this.els.providerIcon.src = CONFIG.paths.search + provider.icon;
    }
  }

  updateButtons() {
    const hasText = this.els.input.value.trim().length > 0;
    const provider = SEARCH_PROVIDERS[this.current.type].find(
      (p) => p.id === this.current.id,
    );

    if (hasText) {
      this.els.searchBtn.classList.remove("hidden");
      this.els.openBtn.classList.add("hidden");
    } else {
      this.els.searchBtn.classList.add("hidden");
      this.els.openBtn.classList.remove("hidden");

      if (provider) {
        this.els.openBtn.textContent = "Open";
        this.els.openBtn.title = `Open ${provider.name}`;
        this.els.openBtn.onclick = () => {
          const urlObj = new URL(provider.url);
          const targets =
            state.get("linkTargets") || CONFIG.defaults.linkTargets;
          window.open(urlObj.origin, targets.searchOpen || "_blank");
        };
      }
    }
  }

  toggleDropdown() {
    const isHidden = this.els.dropdown.classList.contains("hidden");
    if (isHidden) {
      this.openDropdown();
    } else {
      this.closeDropdown();
    }
  }

  openDropdown() {
    this.els.dropdown.classList.remove("hidden");
    this.els.providerBtn.classList.add("is-open");

    const quoteWidget = document.getElementById("quote-widget");
    if (quoteWidget) {
      const pos = state.get("quotePosition");
      if (pos !== "replace") {
        quoteWidget.classList.add("visually-hidden");
      }
    }

    import("../utils.js").then((utils) => {
      utils.completeDefaultTask("dt-4");
    });
  }

  closeDropdown() {
    this.els.dropdown.classList.add("hidden");
    this.els.providerBtn.classList.remove("is-open");

    const quoteWidget = document.getElementById("quote-widget");
    if (quoteWidget) {
      quoteWidget.classList.remove("visually-hidden");
    }
  }

  handleSubmit(e) {
    if (e.preventDefault) e.preventDefault();
    const query = this.els.input.value.trim();
    if (!query) return;

    const provider = SEARCH_PROVIDERS[this.current.type].find(
      (p) => p.id === this.current.id,
    );
    if (!provider) return;

    let url;
    if (provider.searchType === "path") {
      url = `${provider.url}/${encodeURIComponent(query)}`;
    } else {
      url = `${provider.url}?${provider.queryParam}=${encodeURIComponent(query)}`;
    }

    window.location.href = url;
  }
}

// src/modules/search.js YourDynamicDashboard V2.1 (Ditom Baroi Antu - 2025-26)
