// todo.js (Ditom Baroi Antu)

const todoToggleButton = document.getElementById('todo-toggle-button');
const todoPopup = document.getElementById('todo-popup');
const todoList = document.getElementById('todo-list');
const todoAddForm = document.getElementById('todo-add-form');
const todoInput = document.getElementById('todo-input');

let todos = []; 

function renderTodos() {
    if (!todoList) return;
    todoList.innerHTML = '';
    todos.forEach((todo, index) => {
        const item = document.createElement('div');
        item.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        const text = document.createElement('span');
        text.textContent = todo.text;
        text.addEventListener('click', () => toggleTodo(index));
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTodo(index);
        });
        item.appendChild(text);
        item.appendChild(deleteBtn);
        todoList.appendChild(item);
    });
}

function addTodo(text) {
    if (text.trim() === '') return;
    todos.push({ text: text, completed: false });
    saveTodos();
    renderTodos();
}

function deleteTodo(index) {
    todos.splice(index, 1);
    saveTodos();
    renderTodos();
}

function toggleTodo(index) {
    todos[index].completed = !todos[index].completed;
    saveTodos();
    renderTodos();
}

function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

function loadTodos() {
    const savedTodos = localStorage.getItem('todos');
    if (savedTodos) {
        todos = JSON.parse(savedTodos);
    }
    renderTodos();
}

function manageTodoEvents() {
    if (!todoToggleButton || !todoPopup || !todoAddForm) return;

    todoToggleButton.addEventListener('click', (event) => {
        event.stopPropagation();
        todoPopup.classList.toggle('visible');
        todoToggleButton.classList.toggle('is-open');
    });

    todoAddForm.addEventListener('submit', (e) => {
        e.preventDefault();
        addTodo(todoInput.value);
        todoInput.value = '';
    });

    document.addEventListener('click', (event) => {
        if (todoPopup.classList.contains('visible') && !todoPopup.contains(event.target)) {
            todoPopup.classList.remove('visible');
            todoToggleButton.classList.remove('is-open');
        }
    });

    todoPopup.addEventListener('click', (event) => {
        event.stopPropagation();
    });
}

function initializeTodoModule() {
    console.log("To-Do List module loaded.");
    loadTodos();
    manageTodoEvents();
}

document.addEventListener('DOMContentLoaded', initializeTodoModule);

// todo.js (Ditom Baroi Antu)