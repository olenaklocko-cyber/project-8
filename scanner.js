// ===== scanner.js — Пошук рецептів в інтернеті =====

let currentScannedRecipe = null;
let searchTimeout = null;

// API: TheMealDB (безкоштовний, CORS-friendly)
const MEALDB_BASE = 'https://www.themealdb.com/api/json/v1/1';

// Попередньо завантажені українські страви (fallback якщо API не знайшов)
const LOCAL_RECIPES = [
    { name: 'Борщ український', category: 'Обід', time: 90, ingredients: ['500 г яловичини', '3 буряки', '3 картоплини', '1 морква', '1 цибулина', '200 г капусти', '2 ст.л. томатної пасти', '3 зубчики часнику', 'Лавровий лист', 'Сметана', 'Кріп', 'Сіль, перець'], steps: ['Зварити бульйон з яловичини протягом 1 години.', 'Натерти буряк, обсмажити з томатною пастою.', 'Нарізати картоплю кубиками та капусту соломкою.', 'Додати картоплю в бульйон, через 10 хвилин — капусту.', 'Додати обсмажений буряк.', 'Варити ще 15 хвилин.', 'Додати подрібнений часник та лавровий лист.', 'Дати настоятися 20 хвилин. Подавати зі сметаною та кропом.'] },
    { name: 'Вареники', category: 'Обід', time: 60, ingredients: ['500 г борошна', '1 яйце', '200 мл води', '1 кг картоплі', '300 г печериць', '2 цибулини', 'Сіль'], steps: ['Замісити тісто.', 'Зварити та потовкти картоплю.', 'Обсмажити гриби з цибулею.', 'Сформувати вареники.', 'Зварити у підсоленій воді.'] },
    { name: 'Голубці', category: 'Обід', time: 90, ingredients: ['1 качан капусти', '500 г фаршу', '200 г рису', '2 моркви', '2 цибулини', 'Томатний соус', 'Сіль'], steps: ['Зняти листки з капусти.', 'Змішати фарш з відвареним рисом.', 'Загорнути голубці.', 'Покласти в каструлю.', 'Залити соусом та тушкувати 1 годину.'] },
    { name: 'Торт Спартак', category: 'Святкова страва', time: 120, ingredients: ['4 яйця', '200 г цукру', '200 г борошна', '2 ст.л. какао', '1 ч.л. соди', '400 г сметани', '300 г масла', '200 г цукрової пудри'], steps: ['Збити яйця з цукром.', 'Додати борошно та какао.', 'Розділити тісто на 8 частин.', 'Спечи тонкі коржі.', 'Збити масло з цукровою пудрою.', 'Змішати сметану з цукром для крему.', 'Промазати кожен корж.', 'Настояти 8 годин.'] },
    { name: 'Сирна галета', category: 'Сніданок', time: 35, ingredients: ['300 г борошна', '150 г масла', '1 яйце', '400 г сиру', '100 г цукру', '100 г родзинок', 'Ванілін', 'Цукрова пудра'], steps: ['Замісити тісто з борошна, масла та яйця.', 'Розкачати та викласти у форму.', 'Змішати сир з цукром та родзинками.', 'Викласти начинку.', 'Запікати при 180°C 25 хвилин.', 'Посипати цукровою пудрою.'] },
    { name: 'Медовик', category: 'Святкова страва', time: 60, ingredients: ['100 г меду', '100 г цукру', '100 г масла', '3 яйця', '500 г борошна', '1 ч.л. соди', '400 г сметани'], steps: ['Розігріти мед з цукром та маслом.', 'Додати соду.', 'Додати яйця та борошно.', 'Спечи 6-8 коржів.', 'Змішати сметану з цукром для крему.', 'Промазати кожен корж.', 'Настояти 8 годин.'] },
    { name: 'Шарлотка', category: 'Святкова страва', time: 45, ingredients: ['4 яблука', '3 яйця', '1 склянка цукру', '1 склянка борошна', '1 ч.л. кориці', 'Цукрова пудра'], steps: ['Нарізати яблука.', 'Збити яйця з цукром.', 'Додати борошно та корицю.', 'Вилити тісто на яблука.', 'Випікати при 180°C 35-40 хвилин.'] }
];

// ===== Пошук в TheMealDB =====
async function searchMealDB(query) {
    try {
        const resp = await fetch(`${MEALDB_BASE}/search.php?s=${encodeURIComponent(query)}`);
        if (!resp.ok) return [];
        const data = await resp.json();
        if (!data.meals) return [];
        return data.meals.map(meal => parseMealDB(meal));
    } catch (e) {
        console.warn('MealDB search error:', e);
        return [];
    }
}

async function searchMealDBByCategory(category) {
    try {
        const resp = await fetch(`${MEALDB_BASE}/filter.php?c=${encodeURIComponent(category)}`);
        if (!resp.ok) return [];
        const data = await resp.json();
        if (!data.meals) return [];
        return data.meals.map(meal => ({
            id: 'mealdb-' + meal.idMeal,
            name: meal.strMeal,
            category: category,
            time: 45,
            image: meal.strMealThumb,
            source: 'themealdb',
            apiId: meal.idMeal
        }));
    } catch (e) {
        return [];
    }
}

async function getMealDBDetails(id) {
    try {
        const resp = await fetch(`${MEALDB_BASE}/lookup.php?i=${id}`);
        if (!resp.ok) return null;
        const data = await resp.json();
        if (!data.meals || !data.meals[0]) return null;
        return parseMealDB(data.meals[0]);
    } catch (e) {
        return null;
    }
}

function parseMealDB(meal) {
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
        const ing = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];
        if (ing && ing.trim()) {
            ingredients.push(measure ? `${measure.trim()} ${ing.trim()}` : ing.trim());
        }
    }
    const steps = meal.strInstructions
        ? meal.strInstructions.split(/\r?\n/).filter(s => s.trim().length > 3)
        : ['Деталі рецепта дивись на TheMealDB'];

    return {
        id: 'mealdb-' + meal.idMeal,
        name: meal.strMeal,
        category: meal.strCategory || 'Обід',
        time: 45,
        image: meal.strMealThumb,
        ingredients,
        steps,
        source: 'themealdb',
        apiId: meal.idMeal,
        tags: meal.strTags ? meal.strTags.split(',').map(t => t.trim().toLowerCase()) : []
    };
}

// ===== Пошук у локальній базі =====
function searchLocal(query) {
    const q = query.toLowerCase();
    return LOCAL_RECIPES.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.ingredients.some(i => i.toLowerCase().includes(q))
    ).map((r, i) => ({ ...r, id: 'local-' + i, source: 'local' }));
}

// ===== ГОЛОВНИЙ ПОШУК =====
async function searchRecipes(query) {
    const container = document.getElementById('search-results');
    if (!container) return;

    if (query.length < 2) {
        container.innerHTML = '<p class="no-results">Почни вводити назву страви...</p>';
        return;
    }

    container.innerHTML = '<div class="search-loading"><div class="loading-spinner small"></div>Шукаю в інтернеті...</div>';

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        // 1. Шукаємо в TheMealDB
        const mealdbResults = await searchMealDB(query);

        // 2. Шукаємо локально
        const localResults = searchLocal(query);

        // 3. Об'єднуємо
        const allResults = [...mealdbResults, ...localResults];

        if (allResults.length === 0) {
            container.innerHTML = `
                <div class="no-results-found">
                    <p>😕 Нічого не знайдено за запитом «${query}»</p>
                    <p class="no-results-hint">Спробуй іншу назву або скористайся пошуком Google:</p>
                    <a href="https://www.google.com/search?q=${encodeURIComponent(query + ' рецепт українською')}" target="_blank" class="google-search-btn">🔍 Шукати в Google</a>
                </div>`;
            return;
        }

        container.innerHTML = allResults.map(r => `
            <div class="search-result-card" onclick="showRecipe('${r.id}')">
                ${r.image ? `<img src="${r.image}" class="search-result-img" alt="${r.name}">` : ''}
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

// ===== ПОКАЗАТИ ДЕТАЛІ РЕЦЕПТА =====
async function showRecipe(id) {
    const container = document.getElementById('search-container');
    const view = document.getElementById('recipe-view');
    if (!container || !view) return;

    container.classList.add('hidden');
    view.classList.remove('hidden');

    view.innerHTML = '<div class="search-loading"><div class="loading-spinner small"></div>Завантажую рецепт...</div>';

    let recipe = null;

    if (id.startsWith('mealdb-')) {
        const apiId = id.replace('mealdb-', '');
        recipe = await getMealDBDetails(apiId);
    } else if (id.startsWith('local-')) {
        const index = parseInt(id.replace('local-', ''));
        recipe = LOCAL_RECIPES[index] ? { ...LOCAL_RECIPES[index], id, source: 'local' } : null;
    }

    if (!recipe) {
        view.innerHTML = '<p>Рецепт не знайдено.</p><button class="back-btn" onclick="backToSearch()">← Назад</button>';
        return;
    }

    currentScannedRecipe = recipe;

    const emojis = { 'Сніданок': '🌅', 'Обід': '☀️', 'Вечеря': '🌙', 'Святкова страва': '🎉', 'Dessert': '🍰', 'Side': '🥗', 'Pasta': '🍝', 'Seafood': '🐟', 'Chicken': '🍗', 'Beef': '🥩', 'Pork': '🥓', 'Breakfast': '🌅', 'Goat': '🐐', 'Lamb': '🐑', 'Miscellaneous': '🍽️', 'Starter': '🥗', 'Vegan': '🌱', 'Vegetarian': '🥬' };
    const catEmoji = emojis[recipe.category] || '🍽️';
    const sourceBadge = recipe.source === 'themealdb' ? '<span class="source-badge inline">🌐 Рецепт з інтернету</span>' : '';

    view.innerHTML = `
        <button class="back-btn" onclick="backToSearch()">← Назад до пошуку</button>
        ${recipe.image ? `<img src="${recipe.image}" class="recipe-hero-img" alt="${recipe.name}">` : ''}
        <div class="recipe-view-header">
            <span class="scanned-emoji">${catEmoji}</span>
            <div>
                <h3>${recipe.name}</h3>
                ${sourceBadge}
            </div>
        </div>
        <div class="scanned-meta">
            <span class="note-tag">${recipe.category}</span>
            <span class="note-time">⏱ ${recipe.time} хв</span>
        </div>
        <div class="scanned-section">
            <h4>Інгредієнти (${recipe.ingredients.length})</h4>
            <ul id="recipe-ingredients">${recipe.ingredients.map(i => `<li>${i}</li>`).join('')}</ul>
        </div>
        <div class="scanned-section">
            <h4>Кроки приготування</h4>
            <ol id="recipe-steps">${recipe.steps.map(s => `<li>${s}</li>`).join('')}</ol>
        </div>
        <button class="btn-primary save-to-notes-btn" onclick="saveToNotes()">💾 Зберегти в Мій Блокнот</button>
    `;
}

function backToSearch() {
    document.getElementById('search-container').classList.remove('hidden');
    document.getElementById('recipe-view').classList.add('hidden');
    currentScannedRecipe = null;
}

// ===== ЗБЕРЕЖЕННЯ =====
function showCategoryPicker() {
    if (!currentScannedRecipe) return;
    let modal = document.getElementById('category-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'category-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content category-picker">
                <h3>Куди зберегти?</h3>
                <p class="picker-recipe-name" id="picker-recipe-name"></p>
                <div class="category-options">
                    <button class="cat-btn" onclick="confirmSave('Сніданок')">🌅 Сніданок</button>
                    <button class="cat-btn" onclick="confirmSave('Обід')">☀️ Обід</button>
                    <button class="cat-btn" onclick="confirmSave('Вечеря')">🌙 Вечеря</button>
                    <button class="cat-btn" onclick="confirmSave('Святкова страва')">🎉 Святкова страва</button>
                </div>
                <button class="btn-secondary" onclick="closeCategoryPicker()" style="margin-top:12px;width:100%">Скасувати</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    document.getElementById('picker-recipe-name').textContent = currentScannedRecipe.name;
    modal.classList.add('active');
}

function closeCategoryPicker() {
    const modal = document.getElementById('category-modal');
    if (modal) modal.classList.remove('active');
}

function confirmSave(category) {
    if (!currentScannedRecipe) return;
    let notes = [];
    try { const s = localStorage.getItem('smartcookbook_notes'); if (s) notes = JSON.parse(s); } catch(e) {}
    notes.unshift({
        id: Date.now(),
        name: currentScannedRecipe.name,
        category: category,
        time: currentScannedRecipe.time,
        ingredients: Array.isArray(currentScannedRecipe.ingredients) ? currentScannedRecipe.ingredients.join('\n') : currentScannedRecipe.ingredients,
        steps: Array.isArray(currentScannedRecipe.steps) ? currentScannedRecipe.steps.join('\n') : currentScannedRecipe.steps,
        image: currentScannedRecipe.image || '',
        createdAt: new Date().toISOString()
    });
    localStorage.setItem('smartcookbook_notes', JSON.stringify(notes));
    closeCategoryPicker();
    const btn = document.querySelector('.save-to-notes-btn');
    if (btn) {
        btn.textContent = '✅ Збережено в «' + category + '»!';
        btn.style.background = '#2D5016';
        btn.disabled = true;
        setTimeout(() => { btn.textContent = '💾 Зберегти в Мій Блокнот'; btn.style.background = ''; btn.disabled = false; }, 2000);
    }
}

function saveToNotes() {
    showCategoryPicker();
}
