// js/ui/render.js
import { state, saveData } from '../store.js';
import { bindSwipe } from './gestures.js';
import { openEmojiPicker } from './picker.js';
import { changeBudget, handleDelete, inlineEditItem, toggleFolder } from './actions.js';
import { setupCurrentMethod } from './core.js';

export let hoverTimeout = null;
export let hoveredFolderId = null;

export function initSortable() {
    state.sortableInstances.forEach(s => s.destroy());
    state.sortableInstances = [];

    const sortableOptions = {
        group: {
            name: 'nested',
            put: (to, from, dragEl) => {
                if (dragEl.contains(to.el)) return false; 
                return true;
            }
        },
        handle: '.drag-handle', 
        animation: 300, 
        easing: "cubic-bezier(0.25, 1, 0.5, 1)", 
        
        fallbackOnBody: true,
        forceFallback: true,      
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        
        swapThreshold: 0.65,      
        invertSwap: true,         
        
        scroll: document.querySelector('.food-list'),            
        scrollSensitivity: 60,   
        scrollSpeed: 10,         
        bubbleScroll: false,      

        onStart: () => {
            state.isDraggingGlobal = true;
            document.body.classList.add('is-dragging-mode');
            document.querySelectorAll('.swipe-wrapper').forEach(w => w.classList.remove('is-swiping'));
        },
        onMove: (evt, originalEvent) => {
            if (!originalEvent) return;
            
            const clientX = originalEvent.clientX || (originalEvent.touches && originalEvent.touches.length > 0 ? originalEvent.touches[0].clientX : 0);
            const clientY = originalEvent.clientY || (originalEvent.touches && originalEvent.touches.length > 0 ? originalEvent.touches[0].clientY : 0);
            if (!clientX || !clientY) return;

            const elementUnderCursor = document.elementFromPoint(clientX, clientY);
            const targetFolder = elementUnderCursor ? elementUnderCursor.closest('.folder-wrapper') : null;

            if (!targetFolder || targetFolder.dataset.id !== hoveredFolderId) {
                clearTimeout(hoverTimeout);
                hoveredFolderId = null;
            }

            if (targetFolder && !targetFolder.classList.contains('open') && targetFolder.dataset.id !== hoveredFolderId) {
                hoveredFolderId = targetFolder.dataset.id;
                hoverTimeout = setTimeout(() => {
                    if (!targetFolder.classList.contains('open')) {
                        const id = targetFolder.dataset.id;
                        const setOpen = (nodes) => {
                            for (let n of nodes) {
                                if (n.id === id) { n.isOpen = true; return true; }
                                if (n.type === 'folder' && setOpen(n.items)) return true;
                            }
                        };
                        setOpen(state.listData);
                        targetFolder.classList.add('open');
                        saveData();
                    }
                }, 600);
            }
        },
        onEnd: () => {
            state.isDraggingGlobal = false;
            document.body.classList.remove('is-dragging-mode');
            clearTimeout(hoverTimeout);
            hoveredFolderId = null;
            syncStateFromDOM();
        }
    };

    const mainList = document.getElementById('foodList');
    if(mainList) state.sortableInstances.push(new Sortable(mainList, sortableOptions));

    document.querySelectorAll('.folder-content-list').forEach(fl => {
        state.sortableInstances.push(new Sortable(fl, sortableOptions));
    });
}

export function syncStateFromDOM() {
    const rootList = document.getElementById('foodList');
    function parseList(ulElement) {
        let result = [];
        Array.from(ulElement.children).forEach(li => {
            if (li.dataset.type === 'food') {
                result.push({
                    id: li.dataset.id, type: 'food',
                    name: li.dataset.name, budget: li.dataset.budget
                });
            } else if (li.dataset.type === 'folder') {
                const subList = li.querySelector(':scope > .swipe-front > .folder-content > .folder-content-inner > .folder-content-list');
                const titleSpan = li.querySelector(':scope > .swipe-front > .folder-header .folder-title-text'); 
                const emojiSpan = li.querySelector(':scope > .swipe-front > .folder-header .folder-emoji');
                result.push({
                    id: li.dataset.id, type: 'folder',
                    name: titleSpan ? titleSpan.innerText : li.dataset.name,
                    emoji: emojiSpan ? emojiSpan.innerText : '📁',
                    isOpen: li.classList.contains('open'),
                    items: subList ? parseList(subList) : []
                });
            }
        });
        return result;
    }
    state.listData = parseList(rootList);
    saveData(); setupCurrentMethod(); 
}

export function renderFoods() {
    const list = document.getElementById('foodList');
    list.innerHTML = '';
    state.listData.forEach(item => {
        if (item.type === 'food') list.appendChild(createFoodEl(item));
        else if (item.type === 'folder') list.appendChild(createFolderEl(item));
    });
    initSortable(); setupCurrentMethod(); 
}

export function createFoodEl(food) {
    const li = document.createElement('li');
    li.className = 'swipe-wrapper';
    li.dataset.id = food.id; li.dataset.type = 'food';
    li.dataset.name = food.name; li.dataset.budget = food.budget;
    
    li.innerHTML = `
        <div class="swipe-bg swipe-right-bg" onclick="inlineEditItem('${food.id}', false, event)">✏️ 編輯</div>
        <div class="swipe-bg swipe-left-bg" onclick="handleDelete('${food.id}', event)">🗑️ 刪除</div>
        <div class="swipe-front food-item">
            <div class="food-item-left">
                <div class="drag-handle">☰</div>
                <span class="food-name">${food.name}</span>
            </div>
            <div class="food-item-right">
                <div class="inline-budget-group" data-active="${food.budget}">
                    <div class="budget-slider-indicator"></div>
                    <button class="inline-budget-btn" data-val="$" onclick="changeBudget('${food.id}', '$', this, event)">$</button>
                    <button class="inline-budget-btn" data-val="$$" onclick="changeBudget('${food.id}', '$$', this, event)">$$</button>
                    <button class="inline-budget-btn" data-val="$$$" onclick="changeBudget('${food.id}', '$$$', this, event)">$$$</button>
                </div>
            </div>
        </div>
    `;
    const front = li.querySelector('.swipe-front');
    bindSwipe(li, front, food.id, false); 
    return li;
}

export function createFolderEl(folder) {
    const li = document.createElement('li');
    li.className = `swipe-wrapper folder-wrapper ${folder.isOpen ? 'open' : ''}`;
    li.dataset.id = folder.id; li.dataset.type = 'folder'; li.dataset.name = folder.name;
    
    li.innerHTML = `
        <div class="swipe-bg swipe-right-bg" onclick="inlineEditItem('${folder.id}', true, event)">✏️ 編輯</div>
        <div class="swipe-bg swipe-left-bg" onclick="handleDelete('${folder.id}', event)">🗑️ 刪除</div>
        <div class="swipe-front folder-item">
            <div class="folder-header">
                <div class="drag-handle">☰</div>
                <div class="folder-title" onclick="toggleFolder('${folder.id}', event)">
                    <span class="folder-emoji" onclick="openEmojiPicker('${folder.id}', this, event)">${folder.emoji || '📁'}</span> 
                    <span class="folder-title-text">${folder.name}</span> 
                </div>
                <span class="folder-arrow" onclick="toggleFolder('${folder.id}', event)">▼</span>
            </div>
            <div class="folder-content">
                <div class="folder-content-inner">
                    <ul class="folder-content-list" data-folder-id="${folder.id}"></ul>
                </div>
            </div>
        </div>
    `;
    
    const front = li.querySelector('.swipe-front');
    bindSwipe(li, front, folder.id, true); 
    
    const subList = li.querySelector('.folder-content-list');
    
    folder.items.forEach(item => {
        if (item.type === 'food') subList.appendChild(createFoodEl(item));
        else if (item.type === 'folder') subList.appendChild(createFolderEl(item)); 
    });
    return li;
}