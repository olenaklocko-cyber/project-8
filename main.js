// ===== ГОЛОВНИЙ ФАЙЛ: Перемикання вкладок =====

let activeTab = 'catalog';

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(tabId + '-tab').classList.add('active');
    activeTab = tabId;

    if (tabId === 'holidays') renderHolidays();
    if (tabId === 'notes') renderNotes();
}

// Ініціалізація
document.addEventListener('DOMContentLoaded', function() {
    console.log('Smart-кулінарна книга завантажена!');
    if (typeof loadRecipes === 'function') loadRecipes();
});
