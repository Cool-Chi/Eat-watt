// ================= 全局狀態與陣列多選過濾 =================
let activeBudgets = ['$', '$$', '$$$']; 
let listData = []; 
let currentMethodIndex = 0;
let isAnimating = false;
let sortableInstances = []; 
let selectedNewBudget = '$$';
let isDraggingGlobal = false; 

// 資料載入
const savedTree = localStorage.getItem('dinnerFoodsTree');
if (savedTree) {
    listData = JSON.parse(savedTree);
} else {
    const savedLegacy = JSON.parse(localStorage.getItem('dinnerFoods'));
    if (savedLegacy && savedLegacy.length > 0) {
        listData = savedLegacy.map((f, i) => ({
            id: 'food-' + Date.now() + i, type: 'food',
            name: typeof f === 'string' ? f : f.name, budget: f.budget || '$$'
        }));
    } else {
        listData = [
            { id: 'item-1', type: 'food', name: '拉麵', budget: '$$' },
            { id: 'item-2', type: 'food', name: '火鍋', budget: '$$$' },
            { id: 'folder-1', type: 'folder', name: '大餐類', isOpen: false, items: [
                { id: 'item-3', type: 'food', name: '高級壽司', budget: '$$$' },
                { id: 'item-4', type: 'food', name: '法式料理', budget: '$$$' }
            ]}
        ];
    }
    saveData();
}

function saveData() { localStorage.setItem('dinnerFoodsTree', JSON.stringify(listData)); }

function setUIState(disabled) {
    isAnimating = disabled;
    document.querySelectorAll('#actionBtn, #foodInput, #addBtn, #addFolderBtn, .method-tab, .filter-tab, .budget-btn')
        .forEach(btn => btn.disabled = disabled);
}

// ================= 多選預算過濾與即時預覽 =================
function setFilter(budget) {
    if(isAnimating) return;
    
    const idx = activeBudgets.indexOf(budget);
    if (idx > -1) {
        if (activeBudgets.length > 1) { 
            activeBudgets.splice(idx, 1);
        }
    } else {
        activeBudgets.push(budget);
    }
    
    document.querySelectorAll('#budgetFilterBar .filter-tab').forEach(btn => {
        if (activeBudgets.includes(btn.dataset.filter)) btn.classList.add('active');
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
    extractFoods(listData);
    return allFoods.filter(f => activeBudgets.includes(f.budget));
}

// ================= 滑動手勢 (Swipe Reveal + Click) =================
function bindSwipe(wrapperEl, frontEl, id, isFolder) {
    let startX = 0, startY = 0, currentX = 0;
    let isSwiping = false, isVertical = false, isMouseDown = false;
    let currentTranslate = 0; // 記錄卡片目前是開啟還是關閉 (0, 80, -80)

    const startHandler = (e) => {
        if (isDraggingGlobal || isAnimating) return;
        if (e.target.closest('.drag-handle')) return; 
        if (e.target.closest('.inline-budget-group')) return; 
        
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
        if (isDraggingGlobal || isAnimating) return;
        if (isVertical) return;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const dx = clientX - startX;
        const dy = clientY - startY;

        if (!isSwiping) {
            if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
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

            if (totalMove > 100) totalMove = 100 + (totalMove - 100) * 0.2;
            if (totalMove < -100) totalMove = -100 + (totalMove + 100) * 0.2;
            
            currentX = totalMove;
            frontEl.style.transform = `translateX(${currentX}px)`;
        }
    };

    const endHandler = (e) => {
        isMouseDown = false;
        
        if (!isSwiping) {
            // 如果卡片目前是展開狀態，使用者點擊卡片本體則將其收合
            if (currentTranslate !== 0) {
                e.preventDefault();
                e.stopPropagation();
                currentTranslate = 0;
                frontEl.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
                frontEl.style.transform = `translateX(0)`;
                setTimeout(() => wrapperEl.classList.remove('is-swiping'), 300);
            }
            return;
        }
        
        frontEl.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
        
        // 滑動超過距離則將卡片停留在展開狀態 (露出背景按鈕)
        if (currentX < -40) {
            currentTranslate = -80; 
        } else if (currentX > 40) {
            currentTranslate = 80; 
        } else {
            currentTranslate = 0; 
        }
        
        frontEl.style.transform = `translateX(${currentTranslate}px)`;
        if (currentTranslate === 0) {
            setTimeout(() => wrapperEl.classList.remove('is-swiping'), 300);
        }
        setTimeout(() => { isSwiping = false; }, 50);
    };

    frontEl.addEventListener('touchstart', startHandler, {passive: true});
    frontEl.addEventListener('touchmove', moveHandler, {passive: false});
    frontEl.addEventListener('touchend', endHandler);
    frontEl.addEventListener('mousedown', startHandler);
    frontEl.addEventListener('mousemove', moveHandler, {passive: false});
    frontEl.addEventListener('mouseup', endHandler);
    frontEl.addEventListener('mouseleave', endHandler);
    
    // 點擊卡片本體時的額外收合判定
    frontEl.addEventListener('click', (e) => {
        if (currentTranslate !== 0) {
            e.preventDefault(); e.stopPropagation();
            currentTranslate = 0;
            frontEl.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
            frontEl.style.transform = `translateX(0)`;
            setTimeout(() => wrapperEl.classList.remove('is-swiping'), 300);
        }
    });
}

// 行內編輯
window.inlineEditItem = function(id, isFolder) {
    // 點擊編輯後先自動收合卡片
    const wrapper = document.querySelector(`[data-id="${id}"]`);
    if(wrapper) {
        const frontEl = wrapper.querySelector('.swipe-front');
        if (frontEl) {
            frontEl.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
            frontEl.style.transform = `translateX(0)`;
        }
        wrapper.classList.remove('is-swiping');
    }
    
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
        updateName(listData);
        saveData();
        renderFoods();
    };
    
    input.addEventListener('blur', saveRename);
    input.addEventListener('keypress', e => { if(e.key === 'Enter') input.blur(); });
};

// ================= SortableJS 拖曳排序 =================
function initSortable() {
    sortableInstances.forEach(s => s.destroy());
    sortableInstances = [];

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
        scroll: true,            
        scrollSensitivity: 60,   
        scrollSpeed: 10,         
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        onStart: () => {
            isDraggingGlobal = true;
            document.querySelectorAll('.swipe-wrapper').forEach(w => w.classList.remove('is-swiping'));
        },
        onEnd: () => {
            isDraggingGlobal = false;
            syncStateFromDOM();
        }
    };

    const mainList = document.getElementById('foodList');
    if(mainList) sortableInstances.push(new Sortable(mainList, sortableOptions));

    document.querySelectorAll('.folder-content-list').forEach(fl => {
        sortableInstances.push(new Sortable(fl, sortableOptions));
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
    listData = parseList(rootList);
    saveData();
    setupCurrentMethod(); 
}

// ================= UI 渲染與操作 =================
function renderFoods() {
    const list = document.getElementById('foodList');
    list.innerHTML = '';
    listData.forEach(item => {
        if (item.type === 'food') list.appendChild(createFoodEl(item));
        else if (item.type === 'folder') list.appendChild(createFolderEl(item));
    });
    initSortable(); 
    setupCurrentMethod(); 
}

function createFoodEl(food) {
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

function createFolderEl(folder) {
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

function addFood() {
    const input = document.getElementById('foodInput');
    const val = input.value.trim();
    if (val) {
        listData.push({ id: 'food-' + Date.now(), type: 'food', name: val, budget: selectedNewBudget });
        input.value = '';
        saveData(); renderFoods();
    }
}

function addFolder() {
    let maxCount = 0;
    listData.forEach(item => {
        if (item.type === 'folder' && item.name.startsWith('菜單 ')) {
            const num = parseInt(item.name.replace('菜單 ', ''));
            if (!isNaN(num) && num > maxCount) maxCount = num;
        }
    });
    const newName = `菜單 ${maxCount + 1}`;
    listData.unshift({ id: 'folder-' + Date.now(), type: 'folder', name: newName, isOpen: true, items: [] });
    saveData(); renderFoods();
}

// 移除 isAnimating 阻擋，確保任何時候點擊刪除都生效
window.handleDelete = function(id) {
    const removeNode = (nodes) => {
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === id) { nodes.splice(i, 1); return true; }
            if (nodes[i].type === 'folder' && removeNode(nodes[i].items)) return true;
        }
    };
    removeNode(listData);
    saveData(); renderFoods();
};

function changeBudget(id, newBudget, btnEl) {
    if (isDraggingGlobal) return; 
    
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
    updateBudget(listData);
    saveData(); 
    setupCurrentMethod(); // 僅更新即時預覽，不整頁重新渲染以保留 CSS 滑動動畫
}

function toggleFolder(id) {
    if (isAnimating || isDraggingGlobal) return; 
    const toggleOpen = (nodes) => {
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === id) { nodes[i].isOpen = !nodes[i].isOpen; return true; }
            if (nodes[i].type === 'folder' && toggleOpen(nodes[i].items)) return true;
        }
    };
    toggleOpen(listData);
    saveData();
    
    const folderEl = document.querySelector(`[data-id="${id}"]`);
    if (folderEl) folderEl.classList.toggle('open');
}

// ================= 事件綁定 =================
document.querySelectorAll('#addBudgetSelector .budget-btn').forEach(btn => {
    btn.onclick = function() {
        selectedNewBudget = this.dataset.val;
        document.getElementById('addBudgetSelector').setAttribute('data-active', selectedNewBudget);
    };
});
document.getElementById('foodInput').addEventListener('keypress', e => { if (e.key === 'Enter') addFood(); });

// ================= 互動遊戲核心邏輯 (Methods) =================
const methods = [
    {
        id: 'slot', name: '🎰 老虎機',
        setupUI: (zone, pool) => {
            zone.innerHTML = `
                <div class="slots-wrapper">
                    <div class="slot-reel" id="reel0"><div class="slot-strip" id="strip0"></div></div>
                    <div class="slot-reel" id="reel1"><div class="slot-strip" id="strip1"></div></div>
                    <div class="slot-reel" id="reel2"><div class="slot-strip" id="strip2"></div></div>
                </div>`;
            [0, 1, 2].forEach(i => document.getElementById(`strip${i}`).innerHTML = `<div class="slot-item">準備</div>`);
        },
        execute: (zone, pool) => {
            const winnerIdx = Math.floor(Math.random() * pool.length);
            const winner = pool[winnerIdx].name;
            let list = [];
            for(let i = 0; i < 10; i++) list.push(...pool); 
            const htmlString = list.map(f => `<div class="slot-item">${f.name}</div>`).join('');
            const targets = [(pool.length * 5) + winnerIdx, (pool.length * 7) + winnerIdx, (pool.length * 9) + winnerIdx];

            [0, 1, 2].forEach((i) => {
                const strip = document.getElementById(`strip${i}`);
                const reel = document.getElementById(`reel${i}`);
                reel.classList.remove('win');
                strip.style.transition = 'none';
                strip.style.transform = `translateY(0px)`;
                strip.innerHTML = htmlString;
                setTimeout(() => {
                    const duration = 2 + i; 
                    strip.style.transition = `transform ${duration}s cubic-bezier(0.15, 0.85, 0.2, 1)`;
                    strip.style.transform = `translateY(-${targets[i] * 80}px)`; 
                    setTimeout(() => {
                        reel.classList.add('win'); 
                        if (i === 2) setTimeout(() => setUIState(false), 300);
                    }, duration * 1000);
                }, 50);
            });
        }
    },
    {
        id: 'dice', name: '🎲 擲骰子',
        setupUI: (zone, pool) => {
            const numDice = Math.max(1, Math.ceil(pool.length / 5));
            const minSum = numDice, maxSum = numDice * 6, totalPoints = maxSum - minSum + 1;
            let foodPointMap = {};
            for(let p = minSum; p <= maxSum; p++) {
                let idx = Math.floor(((p - minSum) / totalPoints) * pool.length);
                if (idx >= pool.length) idx = pool.length - 1; 
                let foodName = pool[idx].name;
                if (!foodPointMap[foodName]) foodPointMap[foodName] = [];
                foodPointMap[foodName].push(p);
            }
            let badgesHtml = pool.map(f => !foodPointMap[f.name] ? '' : `<div class="mapping-badge"><b>${foodPointMap[f.name].join(', ')} 點</b> = ${f.name}</div>`).join('');
            const dotsHtml = {
                1: '<div class="dot"></div>',
                2: '<div class="dot"></div><div class="dot"></div>',
                3: '<div class="dot"></div><div class="dot"></div><div class="dot"></div>',
                4: '<div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div>',
                5: '<div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div>',
                6: '<div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div>'
            };
            let diceHtml = '';
            for(let i = 0; i < numDice; i++) diceHtml += `<div class="cube-container"><div class="cube" id="die${i}">${[1,2,3,4,5,6].map(face => `<div class="cube-face face-${face}">${dotsHtml[face]}</div>`).join('')}</div></div>`;
            zone.innerHTML = `<div class="dice-wrapper"><div class="mapping-table">${badgesHtml}</div><div class="dice-tray" id="diceTray">${diceHtml}</div><div class="dice-result-msg" id="diceMsg">點擊開始擲骰子</div></div>`;
            zone.dataset.mapping = JSON.stringify(foodPointMap);
        },
        execute: (zone, pool) => {
            const mapping = JSON.parse(zone.dataset.mapping);
            const cubes = zone.querySelectorAll('.cube');
            const msg = document.getElementById('diceMsg');
            msg.style.opacity = 0;
            let sum = 0, results = [];

            cubes.forEach(cube => {
                cube.className = 'cube rolling'; 
                let val = Math.floor(Math.random() * 6) + 1;
                results.push(val); sum += val;
            });

            setTimeout(() => {
                cubes.forEach((cube, index) => cube.className = `cube show-${results[index]}`);
                setTimeout(() => {
                    let winner = pool[0].name;
                    for (let f in mapping) if (mapping[f].includes(sum)) winner = f;
                    msg.innerText = `擲出 ${sum} 點 ➔ 今晚吃 ${winner}！`;
                    msg.style.opacity = 1;
                    setUIState(false);
                }, 1000); 
            }, 1500); 
        }
    },
    {
        id: 'card', name: '🃏 翻撲克牌',
        setupUI: (zone, pool) => {
            zone.innerHTML = `<div class="poker-wrapper"><div class="poker-table" id="pokerTable"></div><div class="poker-msg" id="pokerMsg">點擊開始洗牌</div></div>`;
        },
        execute: (zone, pool) => {
            const table = document.getElementById('pokerTable'), msg = document.getElementById('pokerMsg');
            table.innerHTML = ''; msg.innerText = '洗牌中...';

            const numCards = pool.length;
            let shuffledFoods = [...pool].sort(() => Math.random() - 0.5), cards = [];
            const maxPerRow = 5, rows = Math.ceil(numCards / maxPerRow);
            table.style.height = `${Math.max(160, rows * 140 + 20)}px`;

            for (let i = 0; i < numCards; i++) {
                let card = document.createElement('div');
                card.className = 'playing-card';
                card.innerHTML = `<div class="card-inner"><div class="card-back">♠</div><div class="card-front">${shuffledFoods[i].name}</div></div>`;
                table.appendChild(card); cards.push(card);
            }

            setTimeout(() => {
                cards.forEach((card, i) => {
                    const shiftX = i % 2 === 0 ? -40 : 40; 
                    card.style.transform = `translate(calc(-50% + ${shiftX}px), -50%) rotate(${(Math.random() - 0.5) * 20}deg)`;
                });

                setTimeout(() => {
                    const cardW = 90, cardH = 130, gapX = 15, gapY = 15;
                    cards.forEach((card, i) => {
                        let row = Math.floor(i / maxPerRow), col = i % maxPerRow, cardsInThisRow = Math.min(maxPerRow, numCards - row * maxPerRow);
                        let startX = -((cardsInThisRow - 1) * (cardW + gapX)) / 2, startY = -((rows - 1) * (cardH + gapY)) / 2;
                        let offsetX = startX + col * (cardW + gapX), offsetY = startY + row * (cardH + gapY);
                        card.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) rotate(0deg)`;
                        
                        card.onclick = () => {
                            if (!isAnimating) return; 
                            card.classList.add('flipped'); card.style.zIndex = 10; 
                            cards.forEach((c, idx) => {
                                c.onclick = null;
                                if(idx !== i) { c.style.opacity = '0.4'; c.style.transform += ' scale(0.9)'; setTimeout(() => c.classList.add('flipped'), 800); }
                            });
                            msg.innerText = `決定是：${shuffledFoods[i].name}！`; msg.style.color = 'var(--danger)';
                            setUIState(false); 
                        };
                    });
                    msg.innerText = '請抽一張牌！'; msg.style.color = 'var(--apple-blue)';
                }, 600);
            }, 100); 
        }
    },
    {
        id: 'wheel', name: '🎡 幸運輪盤',
        setupUI: (zone, pool) => {
            zone.innerHTML = `<div class="wheel-wrapper"><div class="wheel-pointer"></div><canvas class="wheel-canvas" id="wheelCanvas" width="500" height="500"></canvas></div><div class="wheel-result" id="wheelResult">轉動輪盤吧</div>`;
            const canvas = document.getElementById('wheelCanvas'), ctx = canvas.getContext('2d'), cx = canvas.width / 2, cy = canvas.height / 2, radius = cx, sliceAngle = (2 * Math.PI) / pool.length;
            const colors = ['#FF3B30', '#FF9500', '#FFCC00', '#4CD964', '#5AC8FA', '#007AFF', '#5856D6', '#FF2D55'];

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            pool.forEach((item, i) => {
                ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, radius, i * sliceAngle, (i + 1) * sliceAngle); ctx.closePath(); ctx.fillStyle = colors[i % colors.length]; ctx.fill();
                ctx.lineWidth = 4; ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--card-bg'); ctx.stroke();
                ctx.save(); ctx.translate(cx, cy); ctx.rotate(i * sliceAngle + sliceAngle / 2); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF'; ctx.font = `bold ${item.name.length > 5 ? 24 : 36}px -apple-system`; ctx.fillText(item.name, radius - 30, 0); ctx.restore();
            });
            canvas.style.transform = `rotate(0deg)`; canvas.dataset.currentRotate = 0;
        },
        execute: (zone, pool) => {
            const canvas = document.getElementById('wheelCanvas'), res = document.getElementById('wheelResult'); res.style.opacity = 0;
            const winnerIdx = Math.floor(Math.random() * pool.length), winner = pool[winnerIdx].name;
            const sliceDeg = 360 / pool.length, targetCenterDeg = (winnerIdx * sliceDeg) + (sliceDeg / 2);
            let currentRotate = parseFloat(canvas.dataset.currentRotate || 0);
            const extraSpins = (5 + Math.floor(Math.random() * 4)) * 360, baseRotate = 270 - targetCenterDeg;
            let finalRotate = currentRotate + extraSpins; finalRotate = finalRotate - (finalRotate % 360) + baseRotate;
            if (finalRotate < currentRotate + extraSpins) finalRotate += 360;

            canvas.style.transform = `rotate(${finalRotate}deg)`; canvas.dataset.currentRotate = finalRotate;
            setTimeout(() => { res.innerText = `決定是：${winner}！`; res.style.opacity = 1; setUIState(false); }, 4000);
        }
    }
];

// ================= 精準滑動膠囊指示器 =================
function updateMethodIndicator() {
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

window.addEventListener('resize', () => { requestAnimationFrame(updateMethodIndicator); });

function renderMethods() {
    const bar = document.getElementById('methodsBar');
    bar.innerHTML = '';
    methods.forEach((m, index) => {
        const btn = document.createElement('button');
        btn.className = `method-tab ${index === currentMethodIndex ? 'active' : ''}`;
        btn.innerText = m.name;
        btn.onclick = () => { if(!isAnimating) switchMethod(index); };
        bar.appendChild(btn);
    });
    requestAnimationFrame(updateMethodIndicator);
    setupCurrentMethod();
}

function switchMethod(index) {
    currentMethodIndex = index;
    const tabs = document.querySelectorAll('.method-tab');
    tabs.forEach((tab, i) => {
        if(i === index) tab.classList.add('active');
        else tab.classList.remove('active');
    });
    updateMethodIndicator();
    setupCurrentMethod();
}

function setupCurrentMethod() {
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

    // 將抽籤名單渲染為精緻的 Badge 標籤
    const badgesHtml = pool.map(f => `<span class="preview-badge">${f.name}</span>`).join('');
    preview.innerHTML = badgesHtml;

    const method = methods[currentMethodIndex];
    actionBtn.disabled = false;
    method.setupUI(zone, pool);
    actionBtn.innerText = `開始 ${method.name.split(' ')[1]}`;
    actionBtn.onclick = () => { 
        if (!isAnimating) { setUIState(true); method.execute(zone, pool); }
    };
}

// ================= 深淺色模式 =================
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

// ================= 程式啟動與 PWA =================
renderFoods();
renderMethods();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW Fail: ', err));
    });
}