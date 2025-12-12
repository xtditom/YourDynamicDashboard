// src/modules/clock.js
import { state } from '../state.js';
import { formatTime } from '../utils.js';

export class Clock {
    constructor() {
        this.els = {
            master: document.querySelector('.master-clock-container'),
            digital: document.getElementById('digital-clock-container'),
            analog: document.getElementById('analog-clock-container'),
            hours: document.getElementById('clock-hours'),
            minutes: document.getElementById('clock-minutes'),
            seconds: document.getElementById('clock-seconds'),
            ampm: document.getElementById('clock-ampm'),
            
            dateRow: document.getElementById('clock-date-row'),
            day: document.getElementById('clock-day'),
            date: document.getElementById('clock-date'),
            
            greeting: document.getElementById('greeting-text'),
            hourHand: document.getElementById('hour-hand'),
            minuteHand: document.getElementById('minute-hand'),
            secondDot: document.getElementById('second-dot')
        };
        
        this.currentGreeting = ""; 
        this.init();
    }

    init() {
        this.update();
        setInterval(() => this.update(), 1000);
        this.updateGreeting();
        
        // Initial visibility check
        this.toggleDateRow(state.get('showDate') === true);

        // --- NEW: Click Greeting to Set Name ---
        if (this.els.greeting) {
            this.els.greeting.style.cursor = 'pointer';
            this.els.greeting.title = "Double-click to set your name";
            this.els.greeting.addEventListener('dblclick', () => this.setUserName());
        }

        state.subscribe((key, value) => {
            if (key === 'clockType' || key === 'clockFormat') this.update();
            if (key === 'showDate') this.toggleDateRow(value);
            if (key === 'userName') {
                this.currentGreeting = ""; // Force refresh
                this.updateGreeting();
            }
        });

        const animate = () => {
            if (state.get('clockType') === 'analog') this.updateAnalog();
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }

    setUserName() {
        const currentName = state.get('userName') || '';
        const newName = prompt("What should I call you?", currentName);
        if (newName !== null) {
            state.set('userName', newName.trim());
        }
    }

    toggleDateRow(show) {
        if (this.els.dateRow) {
            this.els.dateRow.classList.toggle('hidden', !show);
        }
    }

    update() {
        const now = new Date();
        const type = state.get('clockType');
        const format = state.get('clockFormat');

        if (type === 'analog') {
            this.els.master.classList.add('analog-active');
            this.els.master.classList.remove('digital-active');
            this.els.master.style.height = '250px';
        } else {
            this.els.master.classList.remove('analog-active');
            this.els.master.classList.add('digital-active');
            this.els.master.style.height = '140px'; 
        }

        let hours = now.getHours();
        if (format === '12') {
            this.els.ampm.textContent = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
        } else {
            this.els.ampm.textContent = '';
        }

        this.els.hours.textContent = formatTime(hours);
        this.els.minutes.textContent = formatTime(now.getMinutes());
        this.els.seconds.textContent = formatTime(now.getSeconds());

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
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

        const hourDegrees = (hours % 12 + minutes / 60) * 30;
        const minuteDegrees = (minutes + secondsWithMs / 60) * 6;
        
        const secondAngle = secondsWithMs * 6 - 90;
        const radius = 85;
        const radian = secondAngle * (Math.PI / 180);
        const cx = 100 + radius * Math.cos(radian);
        const cy = 100 + radius * Math.sin(radian);

        this.els.hourHand.style.transform = `rotate(${hourDegrees}deg)`;
        this.els.minuteHand.style.transform = `rotate(${minuteDegrees}deg)`;
        this.els.secondDot.setAttribute('cx', cx);
        this.els.secondDot.setAttribute('cy', cy);
    }

    updateGreeting() {
        if (!this.els.greeting) return;
        
        const hour = new Date().getHours();
        let greeting;

        if (hour >= 5 && hour < 6) greeting = "Do you get up early?";
        else if (hour >= 6 && hour < 12) greeting = "Good morning";
        else if (hour >= 12 && hour < 18) greeting = "Good afternoon";
        else if (hour >= 18 && hour < 20) greeting = "Good evening";
        else if (hour >= 20 && hour < 24) greeting = "Good night";
        else greeting = "Are you still awake?";

        // --- NAME INTEGRATION ---
        const userName = state.get('userName');
        if (userName) {
            // Clean up name slightly (capitalize first letter)
            const cleanName = userName.charAt(0).toUpperCase() + userName.slice(1);
            // Don't append name if it's the "question" greeting
            if (!greeting.includes('?')) {
                greeting = `${greeting}, ${cleanName}`;
            }
        }

        // Only run typewriter if the text actually CHANGED
        if (this.currentGreeting !== greeting) {
            this.currentGreeting = greeting;
            setTimeout(() => {
                this.typewriter(this.els.greeting, greeting);
            }, 800);
        }
    }

    typewriter(element, text, speed = 75) {
        element.classList.add('typing-effect'); 
        let i = 0;
        element.textContent = '';
        
        const typing = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(typing);
                element.classList.remove('typing-effect');
            }
        }, speed);
    }
}