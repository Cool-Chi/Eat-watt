// js/ui/actions.js
import { state, saveData } from '../store.js';
import { renderFoods } from './render.js';
import { setupCurrentMethod } from './core.js';

export function addFood() {
    const input = document.getElementById('foodInput');
    const val = input.value.trim();
    if (val) {
        state.listData.push({ id: 'food-' + Date.now(), type: 'food', name: val, budget: state.selectedNewBudget });
        input.value = '';
        saveData(); renderFoods();
    }
}

export function addFolder() {
    let maxCount = 0;
    state.listData.forEach(item => {
        if (item.type === 'folder' && item.name.startsWith('菜單 ')) {
            const num = parseInt(item.name.replace('菜單 ', ''));
            if (!isNaN(num) && num > maxCount) maxCount = num;
        }
    });
    const newName = `菜單 ${maxCount + 1}`;
    state.listData.unshift({ id: 'folder-' + Date.now(), type: 'folder', name: newName, emoji: '📁', isOpen: true, items: [] });
    saveData(); renderFoods();
}

export function handleDelete(id, e) {
    if (e) e.stopPropagation(); 
    const removeNode = (nodes) => {
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === id) { nodes.splice(i, 1); return true; }
            if (nodes[i].type === 'folder' && removeNode(nodes[i].items)) return true;
        }
    };
    removeNode(state.listData);
    saveData(); renderFoods();
}

export function changeBudget(id, newBudget, btnEl, e) {
    if (e) e.stopPropagation(); 
    if (state.isDraggingGlobal) return; 
    
    if (btnEl) {
        const group = btnEl.closest('.inline-budget-group');
        if (group) group.setAttribute('data-active', newBudget);
    }
    
    const updateBudget = (nodes) => {
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === id) { nodes[i].budget = newBudget; return true; }
            if (nodes[i].type === 'folder' && updateBudget(nodes[i].items)) return true;
        }
    };
    updateBudget(state.listData);
    saveData(); setupCurrentMethod(); 
}

export function toggleFolder(id, e) {
    if (e) e.stopPropagation(); 
    if (state.isAnimating || state.isDraggingGlobal) return; 
    const toggleOpen = (nodes) => {
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === id) { nodes[i].isOpen = !nodes[i].isOpen; return true; }
            if (nodes[i].type === 'folder' && toggleOpen(nodes[i].items)) return true;
        }
    };
    toggleOpen(state.listData);
    saveData();
    
    const folderEl = document.querySelector(`[data-id="${id}"]`);
    if (folderEl) folderEl.classList.toggle('open');
}

export function inlineEditItem(id, isFolder, e) {
    if (e) e.stopPropagation(); 
    const wrapper = document.querySelector(`[data-id="${id}"]`);
    if(!wrapper) return;
    
    const frontEl = wrapper.querySelector('.swipe-front');
    if (frontEl) {
        frontEl.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease';
        frontEl.style.transform = `translateX(0)`;
    }
    wrapper.classList.remove('is-swiping');
    
    const titleSpan = isFolder ? wrapper.querySelector('.folder-title-text') : wrapper.querySelector('.food-name');
    const currentName = titleSpan.innerText;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = isFolder ? 'folder-rename-input' : 'food-rename-input';
    
    input.onmousedown = (ev) => ev.stopPropagation();
    input.ontouchstart = (ev) => ev.stopPropagation();
    input.onclick = (ev) => ev.stopPropagation();
    
    titleSpan.replaceWith(input);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    
    const saveRename = () => {
        const newName = input.value.trim() || currentName;
        const updateName = (nodes) => {
            for (let n of nodes) {
                if (n.id === id) { n.name = newName; return true; }
                if (n.type === 'folder' && updateName(n.items)) return true;
            }
        };
        updateName(state.listData);
        saveData(); renderFoods();
    };
    
    input.addEventListener('blur', saveRename);
    input.addEventListener('keypress', ev => { if(ev.key === 'Enter') input.blur(); });
}