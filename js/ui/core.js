// js/ui/core.js
import { state, saveData } from '../store.js';
import { methods } from '../games.js';
import { renderFoods } from './render.js';

export function setUIState(disabled) {
    state.isAnimating = disabled;
    document.querySelectorAll('#actionBtn, #foodInput, #addBtn, #addFolderBtn, .method-tab, .filter-tab, .budget-btn, .folder-btn')
        .forEach(btn => btn.disabled = disabled);
}

export function setFilter(budget) {
    if(state.isAnimating) return;
    
    const idx = state.activeBudgets.indexOf(budget);
    if (idx > -1) {
        if (state.activeBudgets.length > 1) state.activeBudgets.splice(idx, 1);
    } else {
        state.activeBudgets.push(budget);
    }
    
    document.querySelectorAll('#budgetFilterBar .filter-tab').forEach(btn => {
        if (state.activeBudgets.includes(btn.dataset.filter)) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    
    setupCurrentMethod(); 
}

export function getFilteredFoods() {
    let allFoods = [];
    const extractFoods = (nodes) => {
        nodes.forEach(node => {
            if (node.type === 'food') allFoods.push(node);
            else if (node.type === 'folder') extractFoods(node.items);
        });
    };
    extractFoods(state.listData);
    return allFoods.filter(f => state.activeBudgets.includes(f.budget));
}

export function updateMethodIndicator() {
    const bar = document.getElementById('methodsBar');
    if (!bar) return;
    let indicator = document.getElementById('methodIndicator');
    if(!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'methodIndicator';
        indicator.className = 'slider-indicator';
        bar.appendChild(indicator);
    }
    const activeTab = bar.querySelector('.method-tab.active');
    if(activeTab) {
        indicator.style.width = `${activeTab.offsetWidth}px`;
        indicator.style.height = `${activeTab.offsetHeight}px`;
        indicator.style.transform = `translate(${activeTab.offsetLeft}px, ${activeTab.offsetTop}px)`;
    }
}

export function renderMethods() {
    const bar = document.getElementById('methodsBar');
    bar.innerHTML = '';
    methods.forEach((m, index) => {
        const btn = document.createElement('button');
        btn.className = `method-tab ${index === state.currentMethodIndex ? 'active' : ''}`;
        btn.innerText = m.name;
        btn.onclick = () => { if(!state.isAnimating) switchMethod(index); };
        bar.appendChild(btn);
    });
    requestAnimationFrame(updateMethodIndicator);
    setupCurrentMethod();
}

export function switchMethod(index) {
    state.currentMethodIndex = index;
    const tabs = document.querySelectorAll('.method-tab');
    tabs.forEach((tab, i) => {
        if(i === index) tab.classList.add('active');
        else tab.classList.remove('active');
    });
    updateMethodIndicator();
    setupCurrentMethod();
}

export function setupCurrentMethod() {
    const zone = document.getElementById('interactiveZone');
    const actionBtn = document.getElementById('actionBtn');
    const preview = document.getElementById('poolPreview');
    const pool = getFilteredFoods();

    if (pool.length === 0) {
        preview.innerHTML = '';
        zone.innerHTML = `<div class="empty-state">此預算組合內沒有符合的晚餐，請放寬條件！</div>`;
        actionBtn.innerText = '名單為空'; actionBtn.disabled = true; actionBtn.onclick = null;
        return;
    }

    const badgesHtml = pool.map(f => `<span class="preview-badge">${f.name}</span>`).join('');
    preview.innerHTML = badgesHtml;

    const method = methods[state.currentMethodIndex];
    actionBtn.disabled = false;
    method.setupUI(zone, pool);
    actionBtn.innerText = `開始 ${method.name.split(' ')[1]}`;
    actionBtn.onclick = () => { 
        if (!state.isAnimating) { setUIState(true); method.execute(zone, pool, setUIState); }
    };
}