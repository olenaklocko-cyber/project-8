// ===== scanner.js — AI-Сканер страв (Puter.js — безкоштовний AI) =====

let currentScannedRecipe = null;
let currentBase64Image = null;

document.addEventListener('DOMContentLoaded', () => {
    const uploadArea = document.getElementById('upload-area');
    const photoInput = document.getElementById('photo-input');
    photoInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
    });
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault(); uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
});

function openGallery() { const i = document.getElementById('photo-input'); i.removeAttribute('capture'); i.click(); }
function openCamera() { const i = document.getElementById('photo-input'); i.setAttribute('capture', 'environment'); i.click(); }

function handleFile(file) {
    if (!file.type.startsWith('image/')) { alert('Оберіть зображення!'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
        currentBase64Image = e.target.result;
        document.getElementById('preview-img').src = currentBase64Image;
        document.getElementById('upload-area').classList.add('hidden');
        document.getElementById('photo-preview').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

async function analyzePhoto() {
    if (!currentBase64Image) { alert('Завантажте фото!'); return; }

    document.getElementById('photo-preview').classList.add('hidden');
    document.getElementById('scanner-loading').classList.remove('hidden');
    document.getElementById('scanner-result').classList.add('hidden');
    document.getElementById('scanner-error').classList.add('hidden');

    try {
        const response = await puter.ai.chat(
            `Проаналізуй це фото їжі. Поверни JSON українською з ключами: name (назва страви), time (час приготування хвилинами цифрою), category (одне з: Сніданок, Обід, Вечеря, Святкова страва), ingredients (масив реальних інгредієнтів з кількістю), steps (масив покрокових дій приготування). Відповідь ТІЛЬКИ валідний JSON без тексту.`,
            currentBase64Image
        );

        let text = typeof response === 'string' ? response : response?.message?.content || JSON.stringify(response);

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('AI не зміг розпізнати страву');

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
        console.error('Помилка:', error);
        showError(error.message || 'Не вдалося проаналізувати фото. Спробуйте ще раз.');
    }
}

function showResult(recipe) {
    document.getElementById('scanner-loading').classList.add('hidden');
    document.getElementById('scanner-result').classList.remove('hidden');
    const emojis = { 'Сніданок': '🌅', 'Обід': '☀️', 'Вечеря': '🌙', 'Святкова страва': '🎉' };
    document.getElementById('scanned-emoji').textContent = emojis[recipe.category] || '🍽️';
    document.getElementById('scanned-name').textContent = recipe.name;
    document.getElementById('scanned-meta').innerHTML = `<span class="note-tag">${recipe.category}</span><span class="note-time">⏱ ${recipe.time} хв</span>`;
    document.getElementById('scanned-ingredients').innerHTML = recipe.ingredients.map(i => `<li>${i}</li>`).join('');
    document.getElementById('scanned-steps').innerHTML = recipe.steps.map(s => `<li>${s}</li>`).join('');
}

function showError(message) {
    document.getElementById('scanner-loading').classList.add('hidden');
    document.getElementById('scanner-error').classList.remove('hidden');
    document.querySelector('.scanner-error p').textContent = message;
}

function resetScanner() {
    currentBase64Image = null; currentScannedRecipe = null;
    document.getElementById('photo-input').value = '';
    document.getElementById('upload-area').classList.remove('hidden');
    document.getElementById('photo-preview').classList.add('hidden');
    document.getElementById('scanner-loading').classList.add('hidden');
    document.getElementById('scanner-result').classList.add('hidden');
    document.getElementById('scanner-error').classList.add('hidden');
}

function saveToNotes() {
    if (!currentScannedRecipe) return;
    let notes = [];
    try { const s = localStorage.getItem('smartcookbook_notes'); if (s) notes = JSON.parse(s); } catch(e) {}
    notes.unshift({ id: Date.now(), name: currentScannedRecipe.name, category: currentScannedRecipe.category, time: currentScannedRecipe.time, ingredients: currentScannedRecipe.ingredients.join('\n'), steps: currentScannedRecipe.steps.join('\n'), createdAt: new Date().toISOString() });
    localStorage.setItem('smartcookbook_notes', JSON.stringify(notes));
    const btn = document.querySelector('.save-to-notes-btn');
    btn.textContent = '✅ Збережено!'; btn.style.background = '#2D5016'; btn.disabled = true;
    setTimeout(() => { btn.textContent = '💾 Зберегти в Мій Блокнот'; btn.style.background = ''; btn.disabled = false; }, 2000);
}
