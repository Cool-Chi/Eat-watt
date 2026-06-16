// js/main.js
import { state } from './store.js';
import { 
    addFood, addFolder, handleDelete, changeBudget, toggleFolder, 
    setFilter, inlineEditItem, renderFoods, renderMethods, updateMethodIndicator,
    openExportModal, openImportModal, closeModal, handleImport, copyExportData, downloadExportData,
    initEmojiPicker
} from './ui/index.js';

// 將需要被 HTML 行內觸發的函式，掛載到全域 window 上
window.addFood = addFood;
window.addFolder = addFolder;
window.handleDelete = handleDelete;
window.changeBudget = changeBudget;
window.toggleFolder = toggleFolder;
window.setFilter = setFilter;
window.inlineEditItem = inlineEditItem;
window.openExportModal = openExportModal;
window.openImportModal = openImportModal;
window.closeModal = closeModal;
window.handleImport = handleImport;
window.copyExportData = copyExportData;
window.downloadExportData = downloadExportData;

// ================= 事件綁定 =================
document.querySelectorAll('#addBudgetSelector .budget-btn').forEach(btn => {
    btn.onclick = function() {
        state.selectedNewBudget = this.dataset.val;
        document.getElementById('addBudgetSelector').setAttribute('data-active', state.selectedNewBudget);
    };
});

document.getElementById('foodInput').addEventListener('keypress', e => { 
    if (e.key === 'Enter') addFood(); 
});

window.addEventListener('resize', () => { requestAnimationFrame(updateMethodIndicator); });

// ================= 深淺色模式切換 =================
const themeCheckbox = document.getElementById('themeCheckbox');
const modeText = document.getElementById('modeText');
const themeColorMeta = document.getElementById('themeColorMeta'); 
const html = document.documentElement; 
const currentTheme = localStorage.getItem('theme');

if (currentTheme === 'dark') {
    html.classList.add('dark-mode'); themeCheckbox.checked = true; modeText.innerText = 'Dark mode';
    if (themeColorMeta) themeColorMeta.setAttribute('content', '#1C1C1E'); 
} else {
    if (themeColorMeta) themeColorMeta.setAttribute('content', '#F2F2F7'); 
}

themeCheckbox.addEventListener('change', function() {
    if (this.checked) {
        html.classList.add('dark-mode'); modeText.innerText = 'Dark mode'; localStorage.setItem('theme', 'dark');
        if (themeColorMeta) themeColorMeta.setAttribute('content', '#1C1C1E'); 
    } else {
        html.classList.remove('dark-mode'); modeText.innerText = 'Light mode'; localStorage.setItem('theme', 'light');
        if (themeColorMeta) themeColorMeta.setAttribute('content', '#F2F2F7'); 
    }
});

// ================= 程式啟動與 PWA 註冊 =================
document.addEventListener('DOMContentLoaded', () => {
    initEmojiPicker();
    renderFoods();
    renderMethods();
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW Fail: ', err));
    });
}