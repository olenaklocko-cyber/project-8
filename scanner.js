// ===== scanner.js — Пошук рецептів в інтернеті =====
const API_BASE = 'https://recipe-search-api.vercel.app';
let currentScannedRecipe = null;
let searchTimeout = null;

async function searchRecipes(query) {
    const container = document.getElementById('search-results');
    if (!container) return;
    if (query.length < 2) { container.innerHTML = '<p class="no-results">Почни вводити назву страви...</p>'; return; }
    container.innerHTML = '<div class="search-loading"><div class="loading-spinner small"></div>Шукаю...</div>';
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        let results = [];
        try {
            const r = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
            const d = await r.json();
            results = d.results || [];
        } catch(e) { results = []; }
        if (results.length === 0) {
            container.innerHTML = `<div class="no-results-found"><p>😕 Нічого не знайдено</p><a href="https://www.google.com/search?q=${encodeURIComponent(query + ' рецепт')}" target="_blank" class="google-search-btn">🔍 Шукати в Google</a></div>`;
            return;
        }
        container.innerHTML = results.map(r => `
            <div class="search-result-card" onclick="showRecipe('${r.id}')">
                ${r.image ? `<img src="${r.image}" class="search-result-img">` : ''}
                <div class="search-result-info">
                    <h4>${r.name}</h4>
                    <div class="search-result-meta">
                        <span class="note-tag">${r.category || ''}</span>
                        <span class="note-time">⏱ ${r.time} хв</span>
                        <span class="source-badge">${r.source === 'themealdb' ? '🌐 Інтернет' : '📚 Наша база'}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }, 400);
}

async function showRecipe(id) {
    const container = document.getElementById('search-container');
    const view = document.getElementById('recipe-view');
    if (!container || !view) return;
    container.classList.add('hidden');
    view.classList.remove('hidden');
    view.innerHTML = '<div class="search-loading"><div class="loading-spinner small"></div>Завантажую...</div>';
    let recipe = null;
    try {
        const r = await fetch(`${API_BASE}/api/recipe?id=${encodeURIComponent(id)}`);
        if (r.ok) recipe = await r.json();
    } catch(e) {}
    if (!recipe) { view.innerHTML = '<p>Не знайдено</p><button class="back-btn" onclick="backToSearch()">← Назад</button>'; return; }
    currentScannedRecipe = recipe;
    const emojis = { 'Сніданок':'🌅', 'Обід':'☀️', 'Вечеря':'🌙', 'Святкова страва':'🎉', 'Dessert':'🍰', 'Side':'🥗', 'Pasta':'🍝', 'Seafood':'🐟', 'Chicken':'🍗', 'Beef':'🥩', 'Breakfast':'🌅', 'Vegan':'🌱', 'Vegetarian':'🥬' };
    view.innerHTML = `
        <button class="back-btn" onclick="backToSearch()">← Назад до пошуку</button>
        ${recipe.image ? `<img src="${recipe.image}" class="recipe-hero-img">` : ''}
        <div class="recipe-view-header">
            <span class="scanned-emoji">${emojis[recipe.category] || '🍽️'}</span>
            <div><h3>${recipe.name}</h3>${recipe.source === 'themealdb' ? '<span class="source-badge inline">🌐 З інтернету</span>' : ''}</div>
        </div>
        <div class="scanned-meta"><span class="note-tag">${recipe.category}</span><span class="note-time">⏱ ${recipe.time} хв</span></div>
        <div class="scanned-section"><h4>Інгредієнти (${recipe.ingredients.length})</h4><ul>${recipe.ingredients.map(i => `<li>${i}</li>`).join('')}</ul></div>
        <div class="scanned-section"><h4>Кроки приготування</h4><ol>${recipe.steps.map(s => `<li>${s}</li>`).join('')}</ol></div>
        <button class="btn-primary save-to-notes-btn" onclick="saveToNotes()">💾 Зберегти в Мій Блокнот</button>`;
}

function backToSearch() {
    document.getElementById('search-container').classList.remove('hidden');
    document.getElementById('recipe-view').classList.add('hidden');
    currentScannedRecipe = null;
}

function showCategoryPicker() {
    if (!currentScannedRecipe) return;
    let modal = document.getElementById('category-modal');
    if (!modal) {
        modal = document.createElement('div'); modal.id = 'category-modal'; modal.className = 'modal-overlay';
        modal.innerHTML = `<div class="modal-content category-picker">
            <h3>Куди зберегти?</h3>
            <p class="picker-recipe-name" id="picker-recipe-name"></p>
            <div class="category-options">
                <button class="cat-btn" onclick="confirmSave('Сніданок')">🌅 Сніданок</button>
                <button class="cat-btn" onclick="confirmSave('Обід')">☀️ Обід</button>
                <button class="cat-btn" onclick="confirmSave('Вечеря')">🌙 Вечеря</button>
                <button class="cat-btn" onclick="confirmSave('Святкова страва')">🎉 Святкова страва</button>
            </div>
            <button class="btn-secondary" onclick="closeCategoryPicker()" style="margin-top:12px;width:100%">Скасувати</button>
        </div>`;
        document.body.appendChild(modal);
    }
    document.getElementById('picker-recipe-name').textContent = currentScannedRecipe.name;
    modal.classList.add('active');
}
function closeCategoryPicker() { const m = document.getElementById('category-modal'); if (m) m.classList.remove('active'); }
function confirmSave(category) {
    if (!currentScannedRecipe) return;
    let notes = []; try { const s = localStorage.getItem('smartcookbook_notes'); if (s) notes = JSON.parse(s); } catch(e) {}
    notes.unshift({ id: Date.now(), name: currentScannedRecipe.name, category, time: currentScannedRecipe.time,
        ingredients: Array.isArray(currentScannedRecipe.ingredients) ? currentScannedRecipe.ingredients.join('\n') : currentScannedRecipe.ingredients,
        steps: Array.isArray(currentScannedRecipe.steps) ? currentScannedRecipe.steps.join('\n') : currentScannedRecipe.steps,
        image: currentScannedRecipe.image || '', createdAt: new Date().toISOString() });
    localStorage.setItem('smartcookbook_notes', JSON.stringify(notes));
    closeCategoryPicker();
    const btn = document.querySelector('.save-to-notes-btn');
    if (btn) { btn.textContent = '✅ Збережено!'; btn.style.background = '#2D5016'; btn.disabled = true;
        setTimeout(() => { btn.textContent = '💾 Зберегти в Мій Блокнот'; btn.style.background = ''; btn.disabled = false; }, 2000); }
}
function saveToNotes() { showCategoryPicker(); }
