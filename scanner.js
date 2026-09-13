// ===== scanner.js — AI-Сканер страв (TensorFlow.js — в браузері) =====

let currentScannedRecipe = null;
let currentBase64Image = null;
let model = null;

// Список їжі яку розпізнає модель
const FOOD_LABELS = {
    'pizza': 'Піца Маргарита',
    'hamburger': 'Бургер',
    'hot dog': 'Хот-дог',
    'donut': 'Пончик',
    'cake': 'Торт',
    'broccoli': 'Броколі',
    'carrot': 'Морква',
    'apple': 'Яблуко',
    'banana': 'Банан',
    'orange': 'Апельсин',
    'sandwich': 'Бутерброд',
    'bowl': 'Миска (суп/салат)',
    'cup': 'Чашка (напій)',
    'wine glass': 'Келих вина',
    'fork': 'Вилка',
    'knife': 'Ніж',
    'spoon': 'Ложка'
};

// Рецепти для розпізнаних страв
const FOOD_RECIPES = {
    'Піца Маргарита': { name: 'Піца Маргарита', category: 'Вечеря', time: 40, ingredients: ['300 г борошна', '200 мл води', '7 г дріжджів', '200 г моцарели', '3 помідори', 'Базилік', 'Оливкова олія', 'Сіль'], steps: ['Замісити тісто з борошна, води та дріжджів.', 'Дати тісту підійти 1 годину.', 'Розкачати корж.', 'Нарізати помідори та моцарелу.', 'Викласти начинку на корж.', 'Випікати при 200°C 15-20 хвилин.', 'Прикрасити базиліком.'] },
    'Бургер': { name: 'Домашній бургер', category: 'Обід', time: 30, ingredients: ['500 г яловичого фаршу', '4 булочки', '4 листки салату', '2 помідори', '4 скибочки сиру', 'Кетчуп', 'Гірчиця', 'Сіль, перець'], steps: ['Сформувати котлети з фаршу.', 'Обсмажити на грилі або сковороді.', 'Підсмажити булочки.', 'Намазати кетчуп та гірчицю.', 'Викласти котлету, сир, салат, помідор.', 'Накрити верхньою булочкою.'] },
    'Торт': { name: 'Шоколадний торт', category: 'Святкова страва', time: 60, ingredients: ['200 г борошна', '200 г цукру', '100 г какао', '3 яйця', '200 мл молока', '100 мл олії', '10 г розпушувача', '300 г вершкового масла', '200 г цукрової пудри'], steps: ['Змішати сухі інгредієнти.', 'Додати яйця, молоко, олію.', 'Випекти 2 коржі при 180°C 25 хвилин.', 'Збити масло з цукровою пудрою.', 'Промазати коржі кремом.', 'Прикрасити шоколадом.'] },
    'Банан': { name: 'Бананові оладки', category: 'Сніданок', time: 20, ingredients: ['2 банани', '2 яйця', '100 г борошна', '100 мл молока', '1 ст.л. цукру', 'Щіпка солі', 'Олія для смаження'], steps: ['Розім\'яти банани виделкою.', 'Додати яйця та молоко.', 'Всипати борошно та цукр.', 'Перемішати до однорідності.', 'Смажити оладки на сковороді.', 'Подавати з медом або варенням.'] },
    'Яблуко': { name: 'Яблучний пиріг', category: 'Десерт', time: 50, ingredients: ['500 г борошна', '250 г масла', '100 г цукру', '1 яйце', '1 кг яблук', '2 ст.л. кориці', '100 г родзинок'], steps: ['Замісити тісто з борошна, масла, цукру та яйця.', 'Розділити на 2 частини.', 'Розкачати нижній корж.', 'Нарізати яблука, змішати з корицею.', 'Викласти начинку з родзинками.', 'Накрити верхнім коржем.', 'Випікати при 180°C 35-40 хвилин.'] },
    'Морква': { name: 'Морквяний торт', category: 'Десерт', time: 60, ingredients: ['300 г борошна', '300 г натертої моркви', '200 г цукру', '3 яйця', '100 мл олії', '100 г волоських горіхів', 'Кориця', 'Імбир'], steps: ['Змішати яйця з цукром.', 'Додати олію та моркву.', 'Всипати борошно та спеції.', 'Додати подрібнені горіхи.', 'Випекти при 180°C 35 хвилин.', 'Прикрасити кремом з сиру.'] },
    'Апельсин': { name: 'Апельсинове морозиво', category: 'Десерт', time: 30, ingredients: ['4 апельсини', '200 мл вершків', '100 г цукру', '1 ст.л. лимонного соку'], steps: ['Вичавити сік з апельсинів.', 'Змішати з цукром та лимонним соком.', 'Збити вершки.', 'Обережно змішати.', 'Розлити по формах.', 'Заморозити на 4-6 годин.'] },
    'Броколі': { name: 'Броколі з часниковим соусом', category: 'Обід', time: 20, ingredients: ['1 головка броколі', '3 зубчики часнику', '100 мл вершків', '50 г пармезану', 'Сіль, перець'], steps: ['Відварити броколі 5-7 хвилин.', 'Обсмажити часник.', 'Додати вершки та пармезан.', 'Потушкувати соус.', 'Залити броколі соусом.', 'Подавати гарячою.'] },
    'Бутерброд': { name: 'Тост з лососем', category: 'Сніданок', time: 15, ingredients: ['4 скибочки хліба', '200 г слабосолоного лосося', '100 г крем-чізу', 'Кріп', 'Лимон'], steps: ['Підсмажити тости.', 'Намазати крем-чіз.', 'Викласти лосось.', 'Прикрасити кропом.', 'Полити лимоном.'] },
    'Миска (суп/салат)': { name: 'Курячий суп', category: 'Обід', time: 50, ingredients: ['500 г курки', '2 картоплини', '1 морква', '1 цибулина', 'Кріп', 'Сіль'], steps: ['Зварити курку.', 'Додати овочі.', 'Варити 20 хвилин.', 'Посипати кропом.'] }
};

// Ініціалізація
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
    loadModel();
});

async function loadModel() {
    try {
        if (typeof cocoSsd !== 'undefined') {
            model = await cocoSsd.load();
            console.log('Модель завантажена!');
        }
    } catch (e) {
        console.log('Завантаження моделі...');
    }
}

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
        if (!model) {
            await loadModel();
        }

        const img = document.getElementById('preview-img');
        const predictions = await model.detect(img);

        let foundFood = null;
        for (const pred of predictions) {
            const label = pred.class.toLowerCase();
            if (FOOD_LABELS[label]) {
                foundFood = FOOD_LABELS[label];
                break;
            }
        }

        if (foundFood && FOOD_RECIPES[foundFood]) {
            currentScannedRecipe = FOOD_RECIPES[foundFood];
        } else {
            const userDesc = prompt('AI розпізнав об\'єкт, але не зміг визначити страву. Опишіть що на фото (наприклад: "борщ", "паста", "сирники"):');
            if (!userDesc) throw new Error('Скасовано');
            currentScannedRecipe = getRecipeByDescription(userDesc);
        }

        showResult(currentScannedRecipe);

    } catch (error) {
        console.error('Помилка:', error);
        if (error.message !== 'Скасовано') {
            showError(error.message || 'Не вдалося проаналізувати фото.');
        }
    }
}

function getRecipeByDescription(desc) {
    const d = desc.toLowerCase();
    const recipes = {
        'борщ': { name: 'Борщ український', category: 'Обід', time: 90, ingredients: ['500 г яловичини', '3 буряки', '3 картоплини', '1 морква', '1 цибулина', '200 г капусти', 'Томатна паста', 'Часник', 'Сметана', 'Кріп'], steps: ['Зварити бульйон з яловичини 1 годину.', 'Натерти буряк, обсмажити з томатною пастою.', 'Нарізати картоплю та капусту.', 'Додати овочі в бульйон.', 'Додати буряк, варити 15 хвилин.', 'Додати часник та лавровий лист.', 'Подавати зі сметаною та кропом.'] },
        'паста': { name: 'Паста Карбонара', category: 'Вечеря', time: 25, ingredients: ['300 г спагетті', '200 г бекону', '3 яйця', '100 г пармезану', 'Чорний перець'], steps: ['Зварити пасту.', 'Обсмажити бекон.', 'Змішати яйця з сиром.', 'Змішати все разом.'] },
        'сирник': { name: 'Сирники', category: 'Сніданок', time: 20, ingredients: ['400 г сиру', '2 яйця', '4 ст.л. цукру', '5 ст.л. борошна', 'Сметана'], steps: ['Протерти сир.', 'Додати яйця, цукор, борошно.', 'Сформувати сирники.', 'Обсмажити.', 'Подавати зі сметаною.'] },
        'суп': { name: 'Курячий суп', category: 'Обід', time: 50, ingredients: ['500 г курки', '2 картоплини', '1 морква', 'Кріп'], steps: ['Зварити курку.', 'Додати овочі.', 'Варити 20 хвилин.', 'Посипати кропом.'] },
        'олів': { name: 'Салат Олів\'є', category: 'Святкова страва', time: 40, ingredients: ['400 г ковбаси', '5 картоплин', '3 моркви', '4 яйця', '300 г горошку', 'Майонез'], steps: ['Зварити овочі.', 'Нарізати кубиками.', 'Додати горошок.', 'Заправити майонезом.'] },
        'млинці': { name: 'Млинці з сиром', category: 'Сніданок', time: 30, ingredients: ['500 мл молока', '2 яйця', '200 г борошна', '300 г сиру', 'Сметана'], steps: ['Змішати тісто.', 'Смажити млинці.', 'Наповнити сиром.', 'Подавати зі сметаною.'] },
        'каша': { name: 'Гречана каша', category: 'Сніданок', time: 25, ingredients: ['300 г гречки', '200 г грибів', 'Масло', 'Сіль'], steps: ['Обсмажити гриби.', 'Зварити гречку.', 'Змішати.'] },
        'плов': { name: 'Плов', category: 'Обід', time: 60, ingredients: ['700 г м\'яса', '400 г рису', '3 моркви', '2 цибулини', 'Зіра'], steps: ['Обсмажити м\'ясо.', 'Додати овочі.', 'Додати рис та воду.', 'Готувати 20 хвилин.'] }
    };

    for (const [key, recipe] of Object.entries(recipes)) {
        if (d.includes(key)) return recipe;
    }

    return { name: desc.charAt(0).toUpperCase() + desc.slice(1), category: 'Обід', time: 30, ingredients: ['Додайте інгредієнти вручну'], steps: ['Відредагуйте рецепт у Блокноті'] };
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
