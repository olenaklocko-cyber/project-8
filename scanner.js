// ===== scanner.js — AI-Сканер страв (Google Gemini API) =====

// 🔑 Встав свій API ключ тут або введи при першому запуску
const GEMINI_STORAGE_KEY = 'gemini_api_key';

function getGeminiKey() {
    let key = localStorage.getItem(GEMINI_STORAGE_KEY);
    if (!key) {
        key = prompt('Введи свій Gemini API ключ (отримай безкоштовно на aistudio.google.com/apikey):');
        if (key && key.trim()) {
            localStorage.setItem(GEMINI_STORAGE_KEY, key.trim());
        }
    }
    return key;
}

const GEMINI_API_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

let currentScannedRecipe = null;
let currentBase64Image = null;

// ===== Ініціалізація =====
document.addEventListener('DOMContentLoaded', () => {
    const uploadArea = document.getElementById('upload-area');
    const photoInput = document.getElementById('photo-input');

    // Вибір файлу (після вибору через галерею або камеру)
    photoInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    });

    // Drag & Drop
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

// ===== Відкрити галерею (за замовчуванням) =====
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
        const base64 = e.target.result;
        currentBase64Image = base64;

        // Показати прев'ю
        document.getElementById('preview-img').src = base64;
        document.getElementById('upload-area').classList.add('hidden');
        document.getElementById('photo-preview').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

// ===== Аналіз фото через Gemini API =====
async function analyzePhoto() {
    if (!currentBase64Image) {
        alert('Спочатку завантажте фото!');
        return;
    }

    // Показати завантаження
    document.getElementById('photo-preview').classList.add('hidden');
    document.getElementById('scanner-loading').classList.remove('hidden');
    document.getElementById('scanner-result').classList.add('hidden');
    document.getElementById('scanner-error').classList.add('hidden');

    try {
        // Отримуємо ключ
        const apiKey = getGeminiKey();
        if (!apiKey) {
            throw new Error('API ключ не введено. Оновіть сторінку та спробуйте знову.');
        }

        // Підготовка зображення для API
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

        const response = await fetch(`${GEMINI_API_URL_BASE}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `Помилка API: ${response.status}`);
        }

        const data = await response.json();

        // Витягуємо текст відповіді
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('AI не зміг проаналізувати фото');

        // Парсимо JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('AI повернув некоректний формат');

        const recipe = JSON.parse(jsonMatch[0]);

        // Валідація
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

    // Підтвердження
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
