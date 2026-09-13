// ===== scanner.js — AI-Сканер страв =====

const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

let currentScannedRecipe = null;
let currentBase64Image = null;

// ===== Ініціалізація =====
document.addEventListener('DOMContentLoaded', () => {
    const uploadArea = document.getElementById('upload-area');
    const photoInput = document.getElementById('photo-input');

    photoInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    });

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
});

// ===== Відкрити галерею =====
function openGallery() {
    const input = document.getElementById('photo-input');
    input.removeAttribute('capture');
    input.click();
}

// ===== Відкрити камеру =====
function openCamera() {
    const input = document.getElementById('photo-input');
    input.setAttribute('capture', 'environment');
    input.click();
}

// ===== Обробка файлу =====
function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Будь ласка, оберіть зображення!');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        currentBase64Image = e.target.result;
        document.getElementById('preview-img').src = currentBase64Image;
        document.getElementById('upload-area').classList.add('hidden');
        document.getElementById('photo-preview').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

// ===== Аналіз фото =====
async function analyzePhoto() {
    if (!currentBase64Image) {
        alert('Спочатку завантажте фото!');
        return;
    }

    document.getElementById('photo-preview').classList.add('hidden');
    document.getElementById('scanner-loading').classList.remove('hidden');
    document.getElementById('scanner-result').classList.add('hidden');
    document.getElementById('scanner-error').classList.add('hidden');

    try {
        if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
            // Демо-режим: аналіз через опис користувача
            const userDesc = prompt('API ключ не налаштовано. Опишіть що на фото (наприклад: "борщ", "паста", "салат олів\'є"):');
            if (!userDesc) throw new Error('Скасовано');

            currentScannedRecipe = generateDemoRecipe(userDesc);
            showResult(currentScannedRecipe);
            return;
        }

        // Справжній запит до Gemini API
        const base64Data = currentBase64Image.split(',')[1];
        const mimeType = currentBase64Image.split(';')[0].split(':')[1] || 'image/jpeg';

        const requestBody = {
            contents: [{
                parts: [
                    {
                        text: `Проаналізуй це фото страви. Поверни відповідь СУВОРО у форматі JSON українською мовою з такими ключами: name (назва страви), time (час приготування цифрою у хвилинах), category (Сніданок, Обід, Вечеря або Святкова страва), ingredients (масив інгредієнтів), steps (масив покрокових дій). Відповідь має бути ТІЛЬКИ валідним JSON без додаткового тексту.`
                    },
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: base64Data
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 2048
            }
        };

        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `Помилка API: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('AI не зміг проаналізувати фото');

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('AI повернув некоректний формат');

        const recipe = JSON.parse(jsonMatch[0]);
        if (!recipe.name) throw new Error('Не вдалося визначити назву страви');

        currentScannedRecipe = {
            name: recipe.name,
            category: recipe.category || 'Обід',
            time: parseInt(recipe.time) || 30,
            ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
            steps: Array.isArray(recipe.steps) ? recipe.steps : []
        };

        showResult(currentScannedRecipe);

    } catch (error) {
        console.error('Помилка аналізу:', error);
        showError(error.message);
    }
}

// ===== Демо-рецепти (коли API не налаштовано) =====
function generateDemoRecipe(description) {
    const desc = description.toLowerCase();

    const recipes = {
        'борщ': {
            name: 'Борщ український',
            category: 'Обід',
            time: 90,
            ingredients: ['500 г яловичини', '3 буряки', '3 картоплини', '1 морква', '1 цибулина', '200 г капусти', '2 ст.л. томатної пасти', '3 зубчики часнику', 'Лавровий лист', 'Сметана', 'Кріп', 'Сіль, перець'],
            steps: ['Зварити бульйон з яловичини.', 'Натерти буряк, обсмажити з томатною пастою.', 'Нарізати картоплю та капусту.', 'Додати овочі в бульйон.', 'Додати буряк.', 'Варити 15 хвилин.', 'Додати часник та лавровий лист.', 'Подавати зі сметаною та кропом.']
        },
        'паста': {
            name: 'Паста Карбонара',
            category: 'Вечеря',
            time: 25,
            ingredients: ['300 г спагетті', '200 г бекону', '3 яйця', '100 г пармезану', 'Чорний перець', 'Сіль'],
            steps: ['Зварити пасту.', 'Обсмажити бекон.', 'Змішати яйця з тертим сиром.', 'Змішати гарячу пасту з беконом.', 'Додати яєчну суміш.', 'Перемішати на малому вогні.', 'Посипати перцем та сиром.']
        },
        'олів\'є': {
            name: 'Салат Олів\'є',
            category: 'Святкова страва',
            time: 40,
            ingredients: ['400 г вареної ковбаси', '5 картоплин', '3 моркви', '4 яйця', '300 г горошку', '3 огірки', 'Майонез', 'Сіль'],
            steps: ['Зварити картоплю, моркву та яйця.', 'Нарізати ковбасу та огірки.', 'Нарізати яйця та овочі кубиками.', 'Додати горошок.', 'Заправити майонезом.', 'Перемішати та поставити в холодильник.']
        },
        'куря': {
            name: 'Курка запечена з картоплею',
            category: 'Обід',
            time: 60,
            ingredients: ['1 курка', '1 кг картоплі', '2 моркви', '1 цибулина', '2 ст.л. оливкової олії', 'Паприка', 'Розмарин', 'Сіль, перець'],
            steps: ['Промити курку.', 'Нарізати картоплю.', 'Нарізати овочі.', 'Змішати овочі з олією та спеціями.', 'Викласти на деко.', 'Запікати при 180°C 45 хвилин.']
        },
        'суп': {
            name: 'Курячий суп з локшиною',
            category: 'Обід',
            time: 50,
            ingredients: ['500 г курки', '2 картоплини', '1 морква', '1 цибулина', '100 г локшини', 'Кріп', 'Сіль'],
            steps: ['Зварити курку.', 'Додати нарізану картоплю.', 'Додати натерту моркву та цибулю.', 'Варити 20 хвилин.', 'Додати локшину.', 'Варити 5 хвилин.', 'Посипати кропом.']
        },
        'сирники': {
            name: 'Сирники',
            category: 'Сніданок',
            time: 20,
            ingredients: ['400 г сиру', '2 яйця', '4 ст.л. цукру', '5 ст.л. борошна', 'Ванільний цукор', 'Олія для смаження', 'Сметана'],
            steps: ['Протерти сир.', 'Додати яйця, цукор, борошно.', 'Вимісити тісто.', 'Сформувати кружечки.', 'Обсмажити на олії.', 'Подавати зі сметаною.']
        }
    };

    for (const [key, recipe] of Object.entries(recipes)) {
        if (desc.includes(key)) return recipe;
    }

    // Якщо не знайшли — повертаємо загальний рецепт
    return {
        name: description.charAt(0).toUpperCase() + description.slice(1),
        category: 'Обід',
        time: 30,
        ingredients: ['Інгредієнт 1', 'Інгредієнт 2', 'Інгредієнт 3', 'Сіль', 'Перець'],
        steps: ['Підготувати інгредієнти.', 'Змішати разом.', 'Приготувати.', 'Подати до столу.']
    };
}

// ===== Показати результат =====
function showResult(recipe) {
    document.getElementById('scanner-loading').classList.add('hidden');
    document.getElementById('scanner-result').classList.remove('hidden');

    const categoryEmojis = {
        'Сніданок': '🌅',
        'Обід': '☀️',
        'Вечеря': '🌙',
        'Святкова страва': '🎉'
    };

    document.getElementById('scanned-emoji').textContent = categoryEmojis[recipe.category] || '🍽️';
    document.getElementById('scanned-name').textContent = recipe.name;
    document.getElementById('scanned-meta').innerHTML = `
        <span class="note-tag">${recipe.category}</span>
        <span class="note-time">⏱ ${recipe.time} хв</span>
    `;
    document.getElementById('scanned-ingredients').innerHTML =
        recipe.ingredients.map(i => `<li>${i}</li>`).join('');
    document.getElementById('scanned-steps').innerHTML =
        recipe.steps.map(s => `<li>${s}</li>`).join('');
}

// ===== Показати помилку =====
function showError(message) {
    document.getElementById('scanner-loading').classList.add('hidden');
    document.getElementById('scanner-error').classList.remove('hidden');
    document.querySelector('.scanner-error p').textContent = message || 'Ой, щось пішло не так...';
}

// ===== Скинути сканер =====
function resetScanner() {
    currentBase64Image = null;
    currentScannedRecipe = null;
    document.getElementById('photo-input').value = '';
    document.getElementById('upload-area').classList.remove('hidden');
    document.getElementById('photo-preview').classList.add('hidden');
    document.getElementById('scanner-loading').classList.add('hidden');
    document.getElementById('scanner-result').classList.add('hidden');
    document.getElementById('scanner-error').classList.add('hidden');
}

// ===== Зберегти в Блокнот =====
function saveToNotes() {
    if (!currentScannedRecipe) return;

    const NOTES_KEY = 'smartcookbook_notes';
    let userNotes = [];

    try {
        const saved = localStorage.getItem(NOTES_KEY);
        if (saved) userNotes = JSON.parse(saved);
    } catch (e) {}

    const noteToSave = {
        id: Date.now(),
        name: currentScannedRecipe.name,
        category: currentScannedRecipe.category,
        time: currentScannedRecipe.time,
        ingredients: currentScannedRecipe.ingredients.join('\n'),
        steps: currentScannedRecipe.steps.join('\n'),
        createdAt: new Date().toISOString()
    };

    userNotes.unshift(noteToSave);
    localStorage.setItem(NOTES_KEY, JSON.stringify(userNotes));

    const btn = document.querySelector('.save-to-notes-btn');
    btn.textContent = '✅ Збережено!';
    btn.style.background = '#2D5016';
    btn.disabled = true;

    setTimeout(() => {
        btn.textContent = '💾 Зберегти в Мій Блокнот';
        btn.style.background = '';
        btn.disabled = false;
    }, 2000);
}
