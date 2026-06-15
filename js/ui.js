// js/ui.js
import { state, saveData } from './store.js';
import { methods } from './games.js';

export function setUIState(disabled) {
    state.isAnimating = disabled;
    document.querySelectorAll('#actionBtn, #foodInput, #addBtn, #addFolderBtn, .method-tab, .filter-tab, .budget-btn, .folder-btn')
        .forEach(btn => btn.disabled = disabled);
}

// ================= 過濾與預覽 =================
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

function getFilteredFoods() {
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

// ================= 滑動手勢引擎 =================
export function bindSwipe(wrapperEl, frontEl, id, isFolder) {
    let startX = 0, startY = 0, currentX = 0;
    let isSwiping = false, isVertical = false, isMouseDown = false;
    let currentTranslate = 0; 

    const startHandler = (e) => {
        if (state.isDraggingGlobal || state.isAnimating) return;
        if (e.target.closest('.drag-handle') || e.target.closest('.inline-budget-group')) return; 
        
        if (e.touches && e.touches.length > 1) return;
        if (e.type === 'mousedown') isMouseDown = true;
        
        startX = e.touches ? e.touches[0].clientX : e.clientX;
        startY = e.touches ? e.touches[0].clientY : e.clientY;
        currentX = 0;
        isSwiping = false;
        isVertical = false;
        frontEl.style.transition = 'none';
    };

    const moveHandler = (e) => {
        if (!isMouseDown && !e.touches) return; 
        if (state.isDraggingGlobal || state.isAnimating) return;
        if (isVertical) return;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const dx = clientX - startX;
        const dy = clientY - startY;

        if (!isSwiping) {
            if (Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy) * 1.2) {
                isSwiping = true;
                wrapperEl.classList.add('is-swiping'); 
                if (e.cancelable) e.preventDefault(); 
            } else if (Math.abs(dy) > 10) {
                isVertical = true;
                return;
            }
        }

        if (isSwiping) {
            if (e.cancelable) e.preventDefault(); 
            let moveX = dx;
            let totalMove = currentTranslate + moveX;

            if (totalMove > 80) totalMove = 80 + (totalMove - 80) * 0.2;
            if (totalMove < -80) totalMove = -80 + (totalMove + 80) * 0.2;
            
            currentX = totalMove;
            frontEl.style.transform = `translateX(${currentX}px)`;
        }
    };

    const endHandler = (e) => {
        isMouseDown = false;
        if (!isSwiping) {
            if (currentTranslate !== 0) {
                e.preventDefault(); e.stopPropagation();
                currentTranslate = 0;
                frontEl.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease';
                frontEl.style.transform = `translateX(0)`;
                setTimeout(() => wrapperEl.classList.remove('is-swiping'), 300);
            }
            return;
        }
        
        frontEl.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease';
        
        if (currentX < -65) currentTranslate = -80; 
        else if (currentX > 65) currentTranslate = 80; 
        else currentTranslate = 0; 
        
        frontEl.style.transform = `translateX(${currentTranslate}px)`;
        if (currentTranslate === 0) setTimeout(() => wrapperEl.classList.remove('is-swiping'), 300);
        setTimeout(() => { isSwiping = false; }, 50);
    };

    frontEl.addEventListener('touchstart', startHandler, {passive: true});
    frontEl.addEventListener('touchmove', moveHandler, {passive: false});
    frontEl.addEventListener('touchend', endHandler);
    frontEl.addEventListener('mousedown', startHandler);
    frontEl.addEventListener('mousemove', moveHandler, {passive: false});
    frontEl.addEventListener('mouseup', endHandler);
    frontEl.addEventListener('mouseleave', endHandler);
    
    frontEl.addEventListener('click', (e) => {
        if (currentTranslate !== 0) {
            e.preventDefault(); e.stopPropagation();
            currentTranslate = 0;
            frontEl.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease';
            frontEl.style.transform = `translateX(0)`;
            setTimeout(() => wrapperEl.classList.remove('is-swiping'), 300);
        }
    });
}

export function inlineEditItem(id, isFolder) {
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
    
    input.onmousedown = (e) => e.stopPropagation();
    input.ontouchstart = (e) => e.stopPropagation();
    input.onclick = (e) => e.stopPropagation();
    
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
    input.addEventListener('keypress', e => { if(e.key === 'Enter') input.blur(); });
}

// ================= 排序系統 (絕對座標懸停展開 & 全域滾動防失控) =================
let hoverTimeout = null;
let hoveredFolderId = null;

export function initSortable() {
    state.sortableInstances.forEach(s => s.destroy());
    state.sortableInstances = [];

    const sortableOptions = {
        group: {
            name: 'nested',
            put: (to, from, dragEl) => {
                if (to.el.classList.contains('folder-content-list') && dragEl.dataset.type === 'folder') return false;
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
        
        // 將滾動範圍嚴格鎖定在指定清單容器內，避免全網頁失控滾動
        scroll: document.querySelector('.food-list'),            
        scrollSensitivity: 60,   
        scrollSpeed: 10,         
        bubbleScroll: false,      

        onStart: () => {
            state.isDraggingGlobal = true;
            document.body.classList.add('is-dragging-mode'); // 鎖定網頁背景
            document.querySelectorAll('.swipe-wrapper').forEach(w => w.classList.remove('is-swiping'));
        },
        onMove: (evt, originalEvent) => {
            if (!originalEvent) return;
            
            // 使用原生游標的絕對座標來尋找下方元素，解決 related 邊界問題
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
            document.body.classList.remove('is-dragging-mode'); // 解除鎖定
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

function syncStateFromDOM() {
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
                const subList = li.querySelector('.folder-content-list');
                const titleSpan = li.querySelector('.folder-title-text'); 
                result.push({
                    id: li.dataset.id, type: 'folder',
                    name: titleSpan ? titleSpan.innerText : li.dataset.name,
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

// ================= DOM 渲染 =================
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
        <div class="swipe-bg swipe-right-bg" onclick="inlineEditItem('${food.id}', false)">✏️ 編輯</div>
        <div class="swipe-bg swipe-left-bg" onclick="handleDelete('${food.id}')">🗑️ 刪除</div>
        <div class="swipe-front food-item">
            <div class="food-item-left">
                <div class="drag-handle">☰</div>
                <span class="food-name">${food.name}</span>
            </div>
            <div class="food-item-right">
                <div class="inline-budget-group" data-active="${food.budget}">
                    <div class="budget-slider-indicator"></div>
                    <button class="inline-budget-btn" data-val="$" onclick="changeBudget('${food.id}', '$', this)">$</button>
                    <button class="inline-budget-btn" data-val="$$" onclick="changeBudget('${food.id}', '$$', this)">$$</button>
                    <button class="inline-budget-btn" data-val="$$$" onclick="changeBudget('${food.id}', '$$$', this)">$$$</button>
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
        <div class="swipe-bg swipe-right-bg" onclick="inlineEditItem('${folder.id}', true)">✏️ 編輯</div>
        <div class="swipe-bg swipe-left-bg" onclick="handleDelete('${folder.id}')">🗑️ 刪除</div>
        <div class="swipe-front folder-item">
            <div class="folder-header">
                <div class="drag-handle">☰</div>
                <div class="folder-title" onclick="toggleFolder('${folder.id}')">
                    📁 <span class="folder-title-text">${folder.name}</span> 
                </div>
                <span class="folder-arrow" onclick="toggleFolder('${folder.id}')">▼</span>
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
    });
    return li;
}

// ================= 增刪改邏輯 =================
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
    state.listData.unshift({ id: 'folder-' + Date.now(), type: 'folder', name: newName, isOpen: true, items: [] });
    saveData(); renderFoods();
}

export function handleDelete(id) {
    const removeNode = (nodes) => {
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === id) { nodes.splice(i, 1); return true; }
            if (nodes[i].type === 'folder' && removeNode(nodes[i].items)) return true;
        }
    };
    removeNode(state.listData);
    saveData(); renderFoods();
}

export function changeBudget(id, newBudget, btnEl) {
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

export function toggleFolder(id) {
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

// ================= 匯出與匯入 Modal 控制 =================
export function openExportModal() {
    const modal = document.getElementById('dataModal');
    const title = document.getElementById('modalTitle');
    const textarea = document.getElementById('modalTextarea');
    const actions = document.getElementById('modalActions');

    title.innerText = '📤 匯出資料';
    textarea.value = JSON.stringify(state.listData, null, 2);
    textarea.readOnly = true;

    actions.innerHTML = `
        <button class="modal-btn cancel" onclick="closeModal()">取消</button>
        <button class="modal-btn confirm" onclick="downloadExportData()">下載 .json</button>
        <button class="modal-btn confirm" onclick="copyExportData()">複製文字</button>
    `;
    modal.classList.remove('hidden');
}

export function openImportModal() {
    const modal = document.getElementById('dataModal');
    const title = document.getElementById('modalTitle');
    const textarea = document.getElementById('modalTextarea');
    const actions = document.getElementById('modalActions');

    title.innerText = '📥 匯入資料';
    textarea.value = '';
    textarea.readOnly = false;
    textarea.placeholder = '請貼上 JSON 格式資料...';

    actions.innerHTML = `
        <button class="modal-btn cancel" onclick="closeModal()">取消</button>
        <button class="modal-btn confirm" onclick="handleImport()">確認匯入</button>
    `;
    modal.classList.remove('hidden');
}

export function closeModal() {
    document.getElementById('dataModal').classList.add('hidden');
}

export function copyExportData() {
    const textarea = document.getElementById('modalTextarea');
    textarea.select();
    document.execCommand('copy');
    alert('已成功複製到剪貼簿！');
}

export function downloadExportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.listData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "eat-watt-data.json");
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

export function handleImport() {
    const textarea = document.getElementById('modalTextarea');
    try {
        const parsed = JSON.parse(textarea.value);
        if (!Array.isArray(parsed)) throw new Error('匯入的資料必須是陣列 (Array) 格式');
        state.listData = parsed;
        saveData();
        renderFoods();
        closeModal();
        alert('🎉 資料匯入成功！');
    } catch (e) {
        alert('⚠️ JSON 格式錯誤，請檢查內容！\n錯誤訊息：' + e.message);
    }
}

// ================= 遊戲 UI 渲染與指示器 =================
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