import { state } from "../state.js";
import { formatTime, showCustomPrompt } from "../utils.js";

export class Clock {
  constructor() {
    this.els = {
      master: document.querySelector(".master-clock-container"),
      digital: document.getElementById("digital-clock-container"),
      analog: document.getElementById("analog-clock-container"),
      hours: document.getElementById("clock-hours"),
      minutes: document.getElementById("clock-minutes"),
      seconds: document.getElementById("clock-seconds"),
      ampm: document.getElementById("clock-ampm"),

      dateRow: document.getElementById("clock-date-row"),
      day: document.getElementById("clock-day"),
      date: document.getElementById("clock-date"),

      greeting: document.getElementById("greeting-text"),
      hourHand: document.getElementById("hour-hand"),
      minuteHand: document.getElementById("minute-hand"),
      secondDot: document.getElementById("second-dot"),
    };

    this.currentGreeting = "";
    this._secondTimer = null;
    this._animationFrame = null;
    this._greetingDelayTimer = null;
    this._greetingTypingTimer = null;
    this._visibilityHandler = () => this.handleVisibilityChange();
    this.init();
  }

  init() {
    this.update();
    document.addEventListener("visibilitychange", this._visibilityHandler);
    this.startSecondTimer();
    this.updateGreeting();

    this.toggleDateRow(state.get("showDate") === true);
    this.toggleGreetings(state.get("hideGreetings") === true);

    // --- NEW: Click Greeting to Set Name ---
    if (this.els.greeting) {
      this.els.greeting.style.cursor = "pointer";
      this.els.greeting.title = "Double-click to set your name";
      this.els.greeting.addEventListener("dblclick", () => this.setUserName());
    }

    state.subscribe((key, value) => {
      if (key === "clockType" || key === "clockFormat") {
        this.update();
        this.syncAnalogLoop();
        if (key === "clockType" && this.els.master) {
          this.els.master.classList.remove("clock-switched");
          void this.els.master.offsetWidth;
          this.els.master.classList.add("clock-switched");
        }
      }
      if (key === "disableAnimations") this.syncAnalogLoop();
      if (key === "showDate") this.toggleDateRow(value);
      if (key === "hideGreetings") this.toggleGreetings(value);
      if (key === "userName") {
        this.currentGreeting = "";
        this.updateGreeting();
      }
    });

    this.syncAnalogLoop();
  }

  startSecondTimer() {
    clearInterval(this._secondTimer);
    this._secondTimer = null;
    if (document.hidden) return;
    this._secondTimer = window.setInterval(() => this.update(), 1000);
  }

  syncAnalogLoop() {
    const shouldAnimate =
      !document.hidden &&
      state.get("clockType") === "analog";
    if (!shouldAnimate) {
      if (this._animationFrame !== null) {
        cancelAnimationFrame(this._animationFrame);
        this._animationFrame = null;
      }
      return;
    }
    if (this._animationFrame !== null) return;
    const animate = () => {
      if (document.hidden || state.get("clockType") !== "analog") {
        this._animationFrame = null;
        return;
      }
      this.updateAnalog();
      this._animationFrame = requestAnimationFrame(animate);
    };
    this._animationFrame = requestAnimationFrame(animate);
  }

  handleVisibilityChange() {
    if (document.hidden) {
      this.startSecondTimer();
      this.syncAnalogLoop();
      this.cancelGreetingAnimation();
      return;
    }
    this.startSecondTimer();
    this.update();
    this.syncAnalogLoop();
    this.updateGreeting();
  }

  async setUserName() {
    const currentName = state.get("userName") || "";
    const newName = await showCustomPrompt(
      "What should I call you?",
      currentName,
    );
    if (newName !== null) {
      state.set("userName", newName.trim().substring(0, 35));
      import("../utils.js").then((utils) => {
        utils.completeDefaultTask("dt-3");
      });
    }
  }

  toggleDateRow(show) {
    if (this.els.dateRow) {
      this.els.dateRow.classList.toggle("hidden", !show);
    }
  }

  toggleGreetings(hide) {
    if (this.els.greeting) {
      this.els.greeting.style.display = hide ? "none" : "";
      if (hide) this.cancelGreetingAnimation();
      else this.updateGreeting();
    }
  }

  update() {
    const now = new Date();
    const type = state.get("clockType");
    const format = state.get("clockFormat");

    if (type === "analog") {
      this.els.master.classList.add("analog-active");
      this.els.master.classList.remove("digital-active");
      this.els.master.style.height = "250px";
    } else {
      this.els.master.classList.remove("analog-active");
      this.els.master.classList.add("digital-active");
      this.els.master.style.height = "140px";
    }

    let hours = now.getHours();
    if (format === "12") {
      this.els.ampm.textContent = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
    } else {
      this.els.ampm.textContent = "";
    }

    this.els.hours.textContent = formatTime(hours);
    this.els.minutes.textContent = formatTime(now.getMinutes());
    this.els.seconds.textContent = formatTime(now.getSeconds());

    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const dayName = days[now.getDay()];
    const monthName = months[now.getMonth()];
    const dateNum = now.getDate();

    if (this.els.day) this.els.day.textContent = dayName;
    if (this.els.date) this.els.date.textContent = `${dateNum} ${monthName}`;

    if (now.getSeconds() === 0) this.updateGreeting();
  }

  updateAnalog() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const secondsWithMs = now.getSeconds() + now.getMilliseconds() / 1000;
    const motionDisabled = state.get("disableAnimations") === true;

    // Keep the clock live while making motion-disabled updates discrete:
    // hands jump only when their displayed hour/minute changes, and the
    // second marker jumps once per second instead of sweeping.
    const hourDegrees =
      ((hours % 12) + (motionDisabled ? 0 : minutes / 60)) * 30;
    const minuteDegrees =
      (minutes + (motionDisabled ? 0 : secondsWithMs / 60)) * 6;

    const secondAngle = (motionDisabled ? now.getSeconds() : secondsWithMs) * 6 - 90;
    const radius = 85;
    const radian = secondAngle * (Math.PI / 180);
    const cx = 100 + radius * Math.cos(radian);
    const cy = 100 + radius * Math.sin(radian);

    this.els.hourHand.style.transform = `rotate(${hourDegrees}deg)`;
    this.els.minuteHand.style.transform = `rotate(${minuteDegrees}deg)`;
    this.els.secondDot.setAttribute("cx", cx);
    this.els.secondDot.setAttribute("cy", cy);
  }

  updateGreeting() {
    if (!this.els.greeting) return;

    const greeting = this.getGreetingText();
    const displayedGreeting = this.els.greeting.textContent.trim();
    if (this.currentGreeting === greeting && displayedGreeting === greeting) {
      return;
    }

    this.cancelGreetingAnimation();
    this.currentGreeting = greeting;
    if (document.hidden || state.get("hideGreetings") === true) return;
    if (state.get("disableAnimations") === true) {
      this.els.greeting.textContent = greeting;
      return;
    }
    this._greetingDelayTimer = window.setTimeout(() => {
      this._greetingDelayTimer = null;
      if (this.els.greeting.textContent.trim() !== greeting) {
        this.typewriter(this.els.greeting, greeting, 45);
      }
    }, 400);
  }

  getGreetingText() {
    const hour = new Date().getHours();
    let greeting;

    if (hour >= 5 && hour < 6) greeting = "Do you get up early?";
    else if (hour >= 6 && hour < 12) greeting = "Good morning";
    else if (hour >= 12 && hour < 18) greeting = "Good afternoon";
    else if (hour >= 18 && hour < 20) greeting = "Good evening";
    else if (hour >= 20 && hour < 24) greeting = "Good night";
    else greeting = "Are you still awake?";

    // --- NAME INTEGRATION ---
    const userName = state.get("userName");
    if (userName) {
      const cleanName = userName.charAt(0).toUpperCase() + userName.slice(1);
      if (!greeting.includes("?")) {
        greeting = `${greeting}, ${cleanName}`;
      }
    }
    return greeting;
  }

  cancelGreetingAnimation() {
    clearTimeout(this._greetingDelayTimer);
    clearInterval(this._greetingTypingTimer);
    this._greetingDelayTimer = null;
    this._greetingTypingTimer = null;
    this.els.greeting?.classList.remove("typing-effect");
  }

  typewriter(element, text, speed = 75) {
    this.cancelGreetingAnimation();
    element.classList.add("typing-effect");
    let i = 0;
    element.textContent = "";

    this._greetingTypingTimer = window.setInterval(() => {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
      } else {
        clearInterval(this._greetingTypingTimer);
        this._greetingTypingTimer = null;
        element.classList.remove("typing-effect");
      }
    }, speed);
  }
}
// [src/modules/clock.js] YourDynamicDashboard V3.0.0 (Ditom Baroi Antu - 2025-26)
