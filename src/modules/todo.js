// src/modules/todo.js YourDynamicDashboard (Ditom Baroi Antu - 2025-26)

import { state } from '../state.js';

export class TodoManager {
    constructor() {
        this.els = {
            btn: document.getElementById('todo-toggle-button'),
            popup: document.getElementById('todo-popup'),
            list: document.getElementById('todo-list'),
            form: document.getElementById('todo-add-form'),
            input: document.getElementById('todo-input')
        };
        
        if (!this.els.btn) return;

        this.init();
    }

    init() {
        this.render();
        
        // Toggle Popup
        this.els.btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Add Task
        this.els.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.add(this.els.input.value);
            this.els.input.value = '';
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this.els.popup.classList.contains('visible') && !this.els.popup.contains(e.target)) {
                this.close();
            }
        });

        this.els.popup.addEventListener('click', (e) => e.stopPropagation());
        
        // Listen for external updates (e.g. from settings reset)
        state.subscribe((key) => {
            if (key === 'todos') this.render();
            if (key === 'showTodo') this.updateVisibility();
        });
        
        this.updateVisibility();
    }

    toggle() {
        this.els.popup.classList.toggle('visible');
        this.els.btn.classList.toggle('is-open');
    }

    close() {
        this.els.popup.classList.remove('visible');
        this.els.btn.classList.remove('is-open');
    }

    add(text) {
        if (!text.trim()) return;
        const todos = state.get('todos') || [];
        todos.push({ text, completed: false });
        state.set('todos', todos);
        this.render();
    }

    remove(index) {
        const todos = state.get('todos') || [];
        todos.splice(index, 1);
        state.set('todos', todos);
        this.render();
    }

    toggleStatus(index) {
        const todos = state.get('todos') || [];
        todos[index].completed = !todos[index].completed;
        state.set('todos', todos);
        this.render();
    }

    render() {
        this.els.list.innerHTML = '';
        const todos = state.get('todos') || [];
        
        todos.forEach((todo, index) => {
            const item = document.createElement('div');
            item.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            
            const text = document.createElement('span');
            text.textContent = todo.text;
            text.onclick = () => this.toggleStatus(index);
            
            const btn = document.createElement('button');
            btn.className = 'delete-btn';
            btn.innerHTML = '&times;';
            btn.onclick = (e) => { e.stopPropagation(); this.remove(index); };
            
            item.appendChild(text);
            item.appendChild(btn);
            this.els.list.appendChild(item);
        });
    }

    updateVisibility() {
        const show = state.get('showTodo');
        this.els.btn.classList.toggle('hidden', !show);
    }
}

// src/modules/todo.js YourDynamicDashboard (Ditom Baroi Antu - 2025-26)