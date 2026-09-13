// ===== scanner.js — AI-Сканер страв =====

const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

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
        if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
            const userDesc = prompt('Опишіть що на фото (наприклад: "борщ", "паста", "сирники", " Ủchunu pizza"):');
            if (!userDesc) throw new Error('Скасовано');
            currentScannedRecipe = generateDemoRecipe(userDesc);
            showResult(currentScannedRecipe);
            return;
        }
        const base64Data = currentBase64Image.split(',')[1];
        const mimeType = currentBase64Image.split(';')[0].split(':')[1] || 'image/jpeg';
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [
                    { text: 'Проаналізуй фото страви. JSON українською: name, time (хв), category (Сніданок/Обід/Вечеря/Святкова страва), ingredients (масив), steps (масив). Тільки JSON.' },
                    { inline_data: { mime_type: mimeType, data: base64Data } }
                ]}],
                generationConfig: { temperature: 0.4, maxOutputTokens: 2048 }
            })
        });
        if (!response.ok) throw new Error(`Помилка API: ${response.status}`);
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('AI не зміг проаналізувати');
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Некоректний формат');
        const r = JSON.parse(jsonMatch[0]);
        currentScannedRecipe = { name: r.name, category: r.category || 'Обід', time: parseInt(r.time) || 30, ingredients: r.ingredients || [], steps: r.steps || [] };
        showResult(currentScannedRecipe);
    } catch (error) { showError(error.message); }
}

function generateDemoRecipe(desc) {
    const d = desc.toLowerCase();
    const db = {
        'борщ': { name: 'Борщ український', category: 'Обід', time: 90, ingredients: ['500 г яловичини', '3 буряки', '3 картоплини', '1 морква', '1 цибулина', '200 г капусти', '2 ст.л. томатної пасти', '3 зубчики часнику', 'Лавровий лист', 'Сметана', 'Кріп', 'Сіль, перець'], steps: ['Зварити бульйон з яловичини 1 годину.', 'Натерти буряк, обсмажити з томатною пастою.', 'Нарізати картоплю кубиками, капусту соломкою.', 'Додати картоплю в бульйон, через 10 хв — капусту.', 'Додати обсмажений буряк, варити 15 хв.', 'Додати часник та лавровий лист.', 'Дати настоятися 20 хвилин.', 'Подавати зі сметаною та кропом.'] },
        'паста': { name: 'Паста Карбонара', category: 'Вечеря', time: 25, ingredients: ['300 г спагетті', '200 г бекону', '3 яйця', '100 г пармезану', 'Чорний перець', 'Сіль'], steps: ['Зварити пасту в підсоленій воді.', 'Нарізати бекон та обсмажити.', 'Змішати яйця з пармезаном.', 'Додати пасту до бекону.', 'Додати яєчну суміш, швидко перемішати.', 'Подавати з перцем.'] },
        'олів': { name: 'Салат Олів\'є', category: 'Святкова страва', time: 40, ingredients: ['400 г ковбаси', '5 картоплин', '3 моркви', '4 яйця', '300 г горошку', '3 огірки', 'Майонез', 'Сіль'], steps: ['Зварити картоплю, моркву та яйця.', 'Нарізати ковбасу та огірки кубиками.', 'Нарізати яйця.', 'Додати горошок.', 'Заправити майонезом.', 'Поставити в холодильник на 1 годину.'] },
        'куря': { name: 'Курка запечена з картоплею', category: 'Обід', time: 60, ingredients: ['1 курка', '1 кг картоплі', '2 моркви', '1 цибулина', 'Оливкова олія', 'Паприка', 'Розмарин', 'Сіль'], steps: ['Промити курку.', 'Нарізати картоплю часточками.', 'Нарізати моркву та цибулю.', 'Змішати з олією та спеціями.', 'Викласти на деко.', 'Запікати при 180°C 45 хвилин.'] },
        'суп': { name: 'Курячий суп з локшиною', category: 'Обід', time: 50, ingredients: ['500 г курки', '2 картоплини', '1 морква', '1 цибулина', '100 г локшини', 'Кріп', 'Сіль'], steps: ['Зварити курку.', 'Додати картоплю.', 'Додати моркву та цибулю.', 'Варити 20 хвилин.', 'Додати локшину на 5 хвилин.', 'Посипати кропом.'] },
        'сирник': { name: 'Сирники', category: 'Сніданок', time: 20, ingredients: ['400 г сиру', '2 яйця', '4 ст.л. цукру', '5 ст.л. борошна', 'Ванілін', 'Олія', 'Сметана'], steps: ['Протерти сир.', 'Додати яйця, цукор, борошно.', 'Вимісити тісто.', 'Сформувати сирники.', 'Обсмажити з обох сторін.', 'Подавати зі сметаною.'] },
        'сирна галета': { name: 'Сирна галета', category: 'Сніданок', time: 35, ingredients: ['300 г борошна', '150 г масла', '1 яйце', '400 г сиру', '100 г цукру', '100 г родзинок', 'Ванілін', 'Цукрова пудра'], steps: ['Замісити тісто з борошна, масла та яйця.', 'Розкачати та викласти у форму.', 'Змішати сир з цукром та родзинками.', 'Викласти начинку.', 'Запікати при 180°C 25 хвилин.', 'Посипати цукровою пудрою.'] },
        'млинці': { name: 'Млинці з сиром', category: 'Сніданок', time: 30, ingredients: ['500 мл молока', '2 яйця', '200 г борошна', '2 ст.л. цукру', '300 г сиру', 'Сметана', 'Масло'], steps: ['Змішати молоко, яйця, борошно, цукор.', 'Смажити тонкі млинці.', 'Змішати сир з цукром.', 'Наповнити млинці.', 'Згорнути рулетиками.', 'Подавати зі сметаною.'] },
        'піца': { name: 'Піца Маргарита', category: 'Вечеря', time: 40, ingredients: ['300 г борошна', '200 мл води', '7 г дріжджів', '200 г моцарели', '3 помідори', 'Базилік', 'Оливкова олія'], steps: ['Замісити тісто.', 'Дати підійти 1 годину.', 'Розкачати корж.', 'Нарізати помідори та моцарелу.', 'Викласти начинку.', 'Випікати при 200°C 15-20 хвилин.', 'Прикрасити базиліком.'] },
        'котлет': { name: 'Котлети з курки', category: 'Обід', time: 35, ingredients: ['500 г курячого фаршу', '1 цибулина', '1 яйце', '100 г борошна', '100 г панірувальних сухарів', 'Олія', 'Сіль'], steps: ['Змішати фарш з цибулею.', 'Додати яйце та сіль.', 'Сформувати котлети.', 'Обваляти в борошні та сухарях.', 'Обсмажити до золотистого кольору.', 'Подавати з картопляним пюре.'] },
        'борщ': { name: 'Борщ український', category: 'Обід', time: 90, ingredients: ['500 г яловичини', '3 буряки', '3 картоплини', '1 морква', '1 цибулина', '200 г капусти', 'Томатна паста', 'Часник', 'Сметана'], steps: ['Зварити бульйон.', 'Обсмажити буряк.', 'Нарізати овочі.', 'Додати в бульйон.', 'Варити 15 хвилин.', 'Подавати зі сметаною.'] },
        'плов': { name: 'Плов козацький', category: 'Обід', time: 60, ingredients: ['700 г баранини', '400 г рису', '3 моркви', '2 цибулини', 'Часник', 'Зіра', 'Барбарис', 'Сіль'], steps: ['Нарізати м\'ясо.', 'Обсмажити з цибулею.', 'Додати моркву.', 'Додати воду та спеції.', 'Додати рис.', 'Готувати на малому вогні 20 хвилин.'] },
        'холодець': { name: 'Холодець', category: 'Святкова страва', time: 180, ingredients: ['1 кг свинячих ніг', '500 г яловичини', '2 цибулини', '1 морква', 'Часник', 'Лавровий лист', 'Перець'], steps: ['Зварити м\'ясо 3 години.', 'Процідити бульйон.', 'Нарізати м\'ясо.', 'Розлити по формах.', 'Застудити 6 годин.'] },
        'каша': { name: 'Гречана каша з грибами', category: 'Сніданок', time: 25, ingredients: ['300 г гречки', '200 г печериць', '1 цибулина', '50 г масла', 'Сіль'], steps: ['Обсмажити гриби з цибулею.', 'Зварити гречку.', 'Змішати з грибами.', 'Додати масло.', 'Дати настоятися.'] },
        'свекольник': { name: 'Холодний свекольник', category: 'Обід', time: 30, ingredients: ['3 буряки', '2 огірки', '3 яйця', '500 мл кефіру', 'Кріп', 'Сіль'], steps: ['Зварити буряк.', 'Натерти на тертці.', 'Нарізати огірки.', 'Змішати з кефіром.', 'Додати яйця та кріп.', 'Охолодити.'] },
        'вінегрет': { name: 'Вінегрет', category: 'Обід', time: 40, ingredients: ['3 буряки', '3 картоплини', '2 моркви', '200 г квашеної капусти', '3 огірки', 'Олія'], steps: ['Зварити овочі.', 'Нарізати кубиками.', 'Додати капусту та огірки.', 'Заправити олією.'] },
        'сирна запіканка': { name: 'Сирна запіканка', category: 'Сніданок', time: 40, ingredients: ['500 г сиру', '3 яйця', '100 г цукру', '100 г манки', '100 г сметани', '50 г родзинок', 'Ванілін'], steps: ['Протерти сир.', 'Додати яйця, цукор, манку, сметану.', 'Вимішати з родзинками.', 'Змастити форму.', 'Випікати при 180°C 40 хвилин.', 'Подавати зі сметаною.'] },
        'olio': { name: 'Салат Олів\'є', category: 'Святкова страва', time: 40, ingredients: ['400 г ковбаси', '5 картоплин', '3 моркви', '4 яйця', '300 г горошку', '3 огірки', 'Майонез'], steps: ['Зварити овочі.', 'Нарізати кубиками.', 'Додати горошок.', 'Заправити майонезом.'] }
    };

    for (const [key, recipe] of Object.entries(db)) {
        if (d.includes(key)) return recipe;
    }

    return { name: desc.charAt(0).toUpperCase() + desc.slice(1), category: 'Обід', time: 30, ingredients: ['Будь ласка, додайте інгредієнти вручну'], steps: ['Відкрийте Блокнот та відредагуйте цей рецепт'] };
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
    document.querySelector('.scanner-error p').textContent = message || 'Ой, щось пішло не так...';
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
