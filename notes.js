// ===== notes.js — Вкладка "Блокнот" =====

const NOTES_KEY = 'smartcookbook_notes';
let userNotes = [];
let editingNoteId = null;

// ===== Завантаження з LocalStorage =====
function loadNotes() {
    const saved = localStorage.getItem(NOTES_KEY);
    if (saved) {
        try {
            userNotes = JSON.parse(saved);
        } catch (e) {
            userNotes = [];
        }
    }
    renderNotesGrid();
}

// ===== Збереження в LocalStorage =====
function saveNotes() {
    localStorage.setItem(NOTES_KEY, JSON.stringify(userNotes));
}

// ===== Показати форму =====
function openNoteForm(editId) {
    const form = document.getElementById('note-form');
    const empty = document.getElementById('empty-notes');
    form.classList.remove('hidden');
    empty.classList.add('hidden');

    if (editId !== undefined) {
        editingNoteId = editId;
        const note = userNotes.find(n => n.id === editId);
        if (note) {
            document.getElementById('note-form-title').textContent = 'Редагувати рецепт';
            document.getElementById('note-name').value = note.name;
            document.getElementById('note-category').value = note.category || '';
            document.getElementById('note-time').value = note.time || '';
            document.getElementById('note-ingredients').value = note.ingredients;
            document.getElementById('note-steps').value = note.steps;
        }
    } else {
        editingNoteId = null;
        document.getElementById('note-form-title').textContent = 'Новий рецепт';
        document.getElementById('note-name').value = '';
        document.getElementById('note-category').value = '';
        document.getElementById('note-time').value = '';
        document.getElementById('note-ingredients').value = '';
        document.getElementById('note-steps').value = '';
    }

    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== Сховати форму =====
function closeNoteForm() {
    document.getElementById('note-form').classList.add('hidden');
    editingNoteId = null;
    document.getElementById('note-name').value = '';
    document.getElementById('note-category').value = '';
    document.getElementById('note-time').value = '';
    document.getElementById('note-ingredients').value = '';
    document.getElementById('note-steps').value = '';
    document.getElementById('note-form-title').textContent = 'Новий рецепт';
    renderNotesGrid();
}

// ===== Зберегти рецепт =====
function saveNote() {
    const name = document.getElementById('note-name').value.trim();
    const category = document.getElementById('note-category').value;
    const time = document.getElementById('note-time').value;
    const ingredients = document.getElementById('note-ingredients').value.trim();
    const steps = document.getElementById('note-steps').value.trim();

    if (!name) {
        alert('Будь ласка, введіть назву страви!');
        return;
    }
    if (!ingredients) {
        alert('Будь ласка, додайте інгредієнти!');
        return;
    }
    if (!steps) {
        alert('Будь ласка, додайте кроки приготування!');
        return;
    }

    if (editingNoteId !== null) {
        const index = userNotes.findIndex(n => n.id === editingNoteId);
        if (index !== -1) {
            userNotes[index].name = name;
            userNotes[index].category = category;
            userNotes[index].time = time ? parseInt(time) : null;
            userNotes[index].ingredients = ingredients;
            userNotes[index].steps = steps;
            userNotes[index].updatedAt = new Date().toISOString();
        }
    } else {
        const newNote = {
            id: Date.now(),
            name,
            category,
            time: time ? parseInt(time) : null,
            ingredients,
            steps,
            createdAt: new Date().toISOString()
        };
        userNotes.unshift(newNote);
    }

    saveNotes();
    closeNoteForm();
}

// ===== Рендер карток =====
function renderNotesGrid() {
    const grid = document.getElementById('notes-grid');
    const empty = document.getElementById('empty-notes');

    if (userNotes.length === 0) {
        grid.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');

    const categoryEmojis = {
        'Сніданок': '🌅',
        'Обід': '☀️',
        'Вечеря': '🌙',
        'Святкова страва': '🎉',
        'Мої улюблені рецепти': '❤️'
    };

    grid.innerHTML = userNotes.map((note, i) => `
        <div class="note-card" onclick="viewNote(${i})">
            <div class="note-card-header">
                <span class="note-emoji">${categoryEmojis[note.category] || '📝'}</span>
                <div class="note-card-actions">
                    <button class="note-btn-edit" onclick="event.stopPropagation(); openNoteForm(${note.id})" title="Редагувати">✏️</button>
                    <button class="note-btn-delete" onclick="event.stopPropagation(); deleteNote(${note.id})" title="Видалити">✕</button>
                </div>
            </div>
            <h3 class="note-card-name">${note.name}</h3>
            <div class="note-card-meta">
                ${note.category ? `<span class="note-tag">${note.category}</span>` : ''}
                ${note.time ? `<span class="note-time">⏱ ${note.time} хв</span>` : ''}
            </div>
            <p class="note-card-preview">${note.ingredients.split('\n')[0]}...</p>
        </div>
    `).join('');
}

// ===== Переглянути рецепт =====
function viewNote(index) {
    const note = userNotes[index];
    if (!note) return;

    const categoryEmojis = {
        'Сніданок': '🌅',
        'Обід': '☀️',
        'Вечеря': '🌙',
        'Святкова страва': '🎉',
        'Мої улюблені рецепти': '❤️'
    };

    const ingredientsList = note.ingredients.split('\n').filter(i => i.trim());
    const stepsList = note.steps.split('\n').filter(s => s.trim());

    const modal = document.createElement('div');
    modal.className = 'recipe-modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeModal()"></div>
        <div class="modal-content">
            <button class="modal-close" onclick="closeModal()">✕</button>
            <div class="modal-header">
                <span class="modal-emoji">${categoryEmojis[note.category] || '📝'}</span>
                <h2>${note.name}</h2>
                <div class="modal-meta">
                    ${note.category ? `<span class="note-tag">${note.category}</span>` : ''}
                    ${note.time ? `<span class="note-time">⏱ ${note.time} хв</span>` : ''}
                </div>
            </div>
            <div class="modal-section">
                <h3>Інгредієнти</h3>
                <ul class="modal-ingredients">
                    ${ingredientsList.map(i => `<li>${i}</li>`).join('')}
                </ul>
            </div>
            <div class="modal-section">
                <h3>Кроки приготування</h3>
                <ol class="modal-steps">
                    ${stepsList.map(s => `<li>${s}</li>`).join('')}
                </ol>
            </div>
            <div class="modal-actions">
                <button class="modal-btn-edit" onclick="closeModal(); openNoteForm(${note.id})">✏️ Редагувати</button>
                <button class="modal-btn-delete" onclick="closeModal(); deleteNote(${note.id})">🗑 Видалити</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => modal.classList.add('active'));
}

// ===== Видалити рецепт =====
function deleteNote(id) {
    const note = userNotes.find(n => n.id === id);
    if (!note) return;

    if (!confirm(`Видалити "${note.name}"?`)) return;

    userNotes = userNotes.filter(n => n.id !== id);
    saveNotes();
    renderNotesGrid();
}

// ===== Закрити модалку =====
function closeModal() {
    const modal = document.querySelector('.recipe-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
        document.body.style.overflow = '';
    }
}

// ===== Ініціалізація =====
document.addEventListener('DOMContentLoaded', loadNotes);
