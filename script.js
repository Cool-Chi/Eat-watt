// ================= 全局狀態與樹狀資料結構遷移 =================
let currentFilter = 'all'; 
let listData = []; // 改為儲存巢狀結構的 Array
let currentMethodIndex = 0;
let isAnimating = false;
let sortableInstances = []; // 儲存所有的 Sortable 實例

// 資料向下相容處理：將舊版平面陣列升級為具備 ID 的樹狀結構
const savedTree = localStorage.getItem('dinnerFoodsTree');
if (savedTree) {
    listData = JSON.parse(savedTree);
} else {
    const savedLegacy = JSON.parse(localStorage.getItem('dinnerFoods'));
    if (savedLegacy && savedLegacy.length > 0) {
        listData = savedLegacy.map((f, i) => ({
            id: 'food-' + Date.now() + i,
            type: 'food',
            name: typeof f === 'string' ? f : f.name,
            budget: f.budget || '$$'
        }));
    } else {
        listData = [
            { id: 'item-1', type: 'food', name: '拉麵', budget: '$$' },
            { id: 'item-2', type: 'food', name: '火鍋', budget: '$$$' },
            { id: 'folder-1', type: 'folder', name: '速食類', isOpen: false, items: [
                { id: 'item-3', type: 'food', name: '麥當勞', budget: '$' },
                { id: 'item-4', type: 'food', name: '鹹酥雞', budget: '$' }
            ]}
        ];
    }
    saveData();
}

function saveData() {
    localStorage.setItem('dinnerFoodsTree', JSON.stringify(listData));
}

function setUIState(disabled) {
    isAnimating = disabled;
    document.querySelectorAll('#actionBtn, #foodInput, #addBtn, #addFolderBtn, .method-tab, .filter-tab, .budget-btn, .delete-btn, .inline-budget-btn')
        .forEach(btn => btn.disabled = disabled);
}

// 遞迴打平樹狀結構，供右側遊戲核心過濾使用
function getFilteredFoods() {
    let allFoods = [];
    const extractFoods = (nodes) => {
        nodes.forEach(node => {
            if (node.type === 'food') allFoods.push(node);
            else if (node.type === 'folder') extractFoods(node.items);
        });
    };
    extractFoods(listData);
    
    if (currentFilter === 'all') return allFoods;
    return allFoods.filter(f => f.budget === currentFilter);
}

// ================= SortableJS 拖曳排序引擎 =================
function initSortable() {
    // 銷毀舊實例避免重複綁定
    sortableInstances.forEach(s => s.destroy());
    sortableInstances = [];

    const sortableOptions = {
        group: {
            name: 'nested',
            put: (to, from, dragEl) => {
                // 防呆：禁止將「資料夾」放入「另一個資料夾」內，避免無限巢狀崩潰
                if (to.el.classList.contains('folder-content-list') && dragEl.dataset.type === 'folder') return false;
                return true;
            }
        },
        animation: 300, // FLIP 動畫
        easing: "cubic-bezier(0.25, 1, 0.5, 1)", 
        fallbackOnBody: true,
        delay: 200, // 長按 200ms 觸發拖曳 (符合 iOS 習慣)
        delayOnTouchOnly: true, // 僅在觸控螢幕上要求長按，滑鼠可直接拖
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        onEnd: syncStateFromDOM // 拖曳放開後，從 DOM 反向重建 JSON 資料
    };

    // 綁定主列表
    const mainList = document.getElementById('foodList');
    sortableInstances.push(new Sortable(mainList, sortableOptions));

    // 綁定所有子資料夾列表
    document.querySelectorAll('.folder-content-list').forEach(fl => {
        sortableInstances.push(new Sortable(fl, sortableOptions));
    });
}

// 拖放結束後，從目前的 DOM 結構反向推導出新的資料樹
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
                result.push({
                    id: li.dataset.id, type: 'folder',
                    name: li.dataset.name,
                    isOpen: li.classList.contains('open'),
                    items: subList ? parseList(subList) : []
                });
            }
        });
        return result;
    }
    
    listData = parseList(rootList);
    saveData();
    setupCurrentMethod(); // 更新遊戲名單
}

// ================= UI 渲染與資料操作 =================
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
    li.className = 'food-item';
    li.dataset.id = food.id; li.dataset.type = 'food';
    li.dataset.name = food.name; li.dataset.budget = food.budget;
    
    const s1 = food.budget === '$' ? 'active' : '';
    const s2 = food.budget === '$$' ? 'active' : '';
    const s3 = food.budget === '$$$' ? 'active' : '';

    li.innerHTML = `
        <div class="food-item-left">
            <span class="food-name">${food.name}</span>
        </div>
        <div class="food-item-right">
            <div class="inline-budget-group">
                <button class="inline-budget-btn ${s1}" onclick="changeBudget('${food.id}', '$')">$</button>
                <button class="inline-budget-btn ${s2}" onclick="changeBudget('${food.id}', '$$')">$$</button>
                <button class="inline-budget-btn ${s3}" onclick="changeBudget('${food.id}', '$$$')">$$$</button>
            </div>
            <button class="delete-btn" onclick="handleDelete('${food.id}')">✕</button>
        </div>
    `;
    return li;
}

function createFolderEl(folder) {
    const li = document.createElement('li');
    li.className = `folder-item ${folder.isOpen ? 'open' : ''}`;
    li.dataset.id = folder.id; li.dataset.type = 'folder'; li.dataset.name = folder.name;
    
    li.innerHTML = `
        <div class="folder-header">
            <div class="folder-title" onclick="toggleFolder('${folder.id}')">
                📁 <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${folder.name}</span> 
                <span class="folder-arrow">▼</span>
            </div>
            <button class="delete-btn" onclick="handleDelete('${folder.id}')">✕</button>
        </div>
        <div class="folder-content">
            <div class="folder-content-inner">
                <ul class="folder-content-list" data-folder-id="${folder.id}"></ul>
            </div>
        </div>
    `;
    
    const subList = li.querySelector('.folder-content-list');
    folder.items.forEach(item => {
        if (item.type === 'food') subList.appendChild(createFoodEl(item));
    });
    return li;
}

// ================= 資料操作邏輯 (遞迴) =================
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
    const folderName = prompt("請輸入新資料夾名稱：", "新資料夾");
    if (folderName && folderName.trim()) {
        listData.push({ id: 'folder-' + Date.now(), type: 'folder', name: folderName.trim(), isOpen: true, items: [] });
        saveData(); renderFoods();
    }
}

function handleDelete(id) {
    if (isAnimating) return;
    const removeNode = (nodes) => {
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === id) { nodes.splice(i, 1); return true; }
            if (nodes[i].type === 'folder' && removeNode(nodes[i].items)) return true;
        }
    };
    removeNode(listData);
    saveData(); renderFoods();
}

function changeBudget(id, newBudget) {
    if (isAnimating) return;
    const updateBudget = (nodes) => {
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === id) { nodes[i].budget = newBudget; return true; }
            if (nodes[i].type === 'folder' && updateBudget(nodes[i].items)) return true;
        }
    };
    updateBudget(listData);
    saveData(); renderFoods();
}

// 展開/收起資料夾 (不觸發全域 re-render，維持流暢動畫)
function toggleFolder(id) {
    if (isAnimating) return;
    const toggleOpen = (nodes) => {
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === id) { nodes[i].isOpen = !nodes[i].isOpen; return true; }
            if (nodes[i].type === 'folder' && toggleOpen(nodes[i].items)) return true;
        }
    };
    toggleOpen(listData);
    saveData();
    
    // 單獨操作 DOM class 觸發 CSS 動畫
    const folderEl = document.querySelector(`[data-id="${id}"]`);
    if (folderEl) folderEl.classList.toggle('open');
}

// ================= 互動遊戲核心邏輯 (Methods) =================

const methods = [
    {
        id: 'slot',
        name: '🎰 老虎機',
        setupUI: (zone, pool) => {
            zone.innerHTML = `
                <div class="slots-wrapper">
                    <div class="slot-reel" id="reel0"><div class="slot-strip" id="strip0"></div></div>
                    <div class="slot-reel" id="reel1"><div class="slot-strip" id="strip1"></div></div>
                    <div class="slot-reel" id="reel2"><div class="slot-strip" id="strip2"></div></div>
                </div>
            `;
            [0, 1, 2].forEach(i => document.getElementById(`strip${i}`).innerHTML = `<div class="slot-item">準備</div>`);
        },
        execute: (zone, pool) => {
            const winnerIdx = Math.floor(Math.random() * pool.length);
            const winner = pool[winnerIdx].name;
            
            let list = [];
            for(let i = 0; i < 10; i++) list.push(...pool); 
            const htmlString = list.map(f => `<div class="slot-item">${f.name}</div>`).join('');

            const targets = [
                (pool.length * 5) + winnerIdx,
                (pool.length * 7) + winnerIdx,
                (pool.length * 9) + winnerIdx
            ];

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
        id: 'dice',
        name: '🎲 擲骰子',
        setupUI: (zone, pool) => {
            const numDice = Math.max(1, Math.ceil(pool.length / 5));
            const minSum = numDice;
            const maxSum = numDice * 6;
            const totalPoints = maxSum - minSum + 1;

            let foodPointMap = {};
            for(let p = minSum; p <= maxSum; p++) {
                let idx = Math.floor(((p - minSum) / totalPoints) * pool.length);
                if (idx >= pool.length) idx = pool.length - 1; 
                let foodName = pool[idx].name;
                if (!foodPointMap[foodName]) foodPointMap[foodName] = [];
                foodPointMap[foodName].push(p);
            }

            let badgesHtml = pool.map(f => {
                if(!foodPointMap[f.name]) return '';
                return `<div class="mapping-badge"><b>${foodPointMap[f.name].join(', ')} 點</b> = ${f.name}</div>`;
            }).join('');

            const dotsHtml = {
                1: '<div class="dot"></div>',
                2: '<div class="dot"></div><div class="dot"></div>',
                3: '<div class="dot"></div><div class="dot"></div><div class="dot"></div>',
                4: '<div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div>',
                5: '<div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div>',
                6: '<div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div>'
            };

            let diceHtml = '';
            for(let i = 0; i < numDice; i++) {
                diceHtml += `
                <div class="cube-container">
                    <div class="cube" id="die${i}">
                        ${[1,2,3,4,5,6].map(face => `<div class="cube-face face-${face}">${dotsHtml[face]}</div>`).join('')}
                    </div>
                </div>`;
            }

            zone.innerHTML = `
                <div class="dice-wrapper">
                    <div class="mapping-table">${badgesHtml}</div>
                    <div class="dice-tray" id="diceTray">${diceHtml}</div>
                    <div class="dice-result-msg" id="diceMsg">點擊開始擲骰子</div>
                </div>
            `;
            zone.dataset.mapping = JSON.stringify(foodPointMap);
        },
        execute: (zone, pool) => {
            const mapping = JSON.parse(zone.dataset.mapping);
            const cubes = zone.querySelectorAll('.cube');
            const msg = document.getElementById('diceMsg');
            msg.style.opacity = 0;

            let sum = 0;
            let results = [];

            cubes.forEach(cube => {
                cube.className = 'cube rolling'; 
                let val = Math.floor(Math.random() * 6) + 1;
                results.push(val);
                sum += val;
            });

            setTimeout(() => {
                cubes.forEach((cube, index) => cube.className = `cube show-${results[index]}`);

                setTimeout(() => {
                    let winner = pool[0].name;
                    for (let f in mapping) {
                        if (mapping[f].includes(sum)) winner = f;
                    }
                    msg.innerText = `擲出 ${sum} 點 ➔ 今晚吃 ${winner}！`;
                    msg.style.opacity = 1;
                    setUIState(false);
                }, 1000); 
            }, 1500); 
        }
    },
    {
        id: 'card',
        name: '🃏 翻撲克牌',
        setupUI: (zone, pool) => {
            zone.innerHTML = `
                <div class="poker-wrapper">
                    <div class="poker-table" id="pokerTable"></div>
                    <div class="poker-msg" id="pokerMsg">點擊開始洗牌</div>
                </div>
            `;
        },
        execute: (zone, pool) => {
            const table = document.getElementById('pokerTable');
            const msg = document.getElementById('pokerMsg');
            table.innerHTML = '';
            msg.innerText = '洗牌中...';

            const numCards = pool.length;
            let shuffledFoods = [...pool].sort(() => Math.random() - 0.5);
            let cards = [];
            
            const maxPerRow = 5; 
            const rows = Math.ceil(numCards / maxPerRow);
            table.style.height = `${Math.max(160, rows * 140 + 20)}px`;

            for (let i = 0; i < numCards; i++) {
                let card = document.createElement('div');
                card.className = 'playing-card';
                card.innerHTML = `
                    <div class="card-inner">
                        <div class="card-back">♠</div>
                        <div class="card-front">${shuffledFoods[i].name}</div>
                    </div>
                `;
                table.appendChild(card);
                cards.push(card);
            }

            setTimeout(() => {
                cards.forEach((card, i) => {
                    const shiftX = i % 2 === 0 ? -40 : 40; 
                    card.style.transform = `translate(calc(-50% + ${shiftX}px), -50%) rotate(${(Math.random() - 0.5) * 20}deg)`;
                });

                setTimeout(() => {
                    const cardW = 90, cardH = 130, gapX = 15, gapY = 15;
                    cards.forEach((card, i) => {
                        let row = Math.floor(i / maxPerRow);
                        let col = i % maxPerRow;
                        let cardsInThisRow = Math.min(maxPerRow, numCards - row * maxPerRow);
                        
                        let startX = -((cardsInThisRow - 1) * (cardW + gapX)) / 2;
                        let startY = -((rows - 1) * (cardH + gapY)) / 2;
                        
                        let offsetX = startX + col * (cardW + gapX);
                        let offsetY = startY + row * (cardH + gapY);
                        
                        card.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) rotate(0deg)`;
                        
                        card.onclick = () => {
                            if (!isAnimating) return; 
                            card.classList.add('flipped');
                            card.style.zIndex = 10; 
                            
                            cards.forEach((c, idx) => {
                                c.onclick = null;
                                if(idx !== i) {
                                    c.style.opacity = '0.4';
                                    c.style.transform += ' scale(0.9)';
                                    setTimeout(() => c.classList.add('flipped'), 800);
                                }
                            });
                            
                            msg.innerText = `決定是：${shuffledFoods[i].name}！`;
                            msg.style.color = 'var(--danger)';
                            setUIState(false); 
                        };
                    });
                    msg.innerText = '請抽一張牌！';
                    msg.style.color = 'var(--apple-blue)';
                }, 600);
            }, 100); 
        }
    },
    {
        id: 'wheel',
        name: '🎡 幸運輪盤',
        setupUI: (zone, pool) => {
            zone.innerHTML = `
                <div class="wheel-wrapper">
                    <div class="wheel-pointer"></div>
                    <canvas class="wheel-canvas" id="wheelCanvas" width="500" height="500"></canvas>
                </div>
                <div class="wheel-result" id="wheelResult">轉動輪盤吧</div>
            `;
            const canvas = document.getElementById('wheelCanvas');
            const ctx = canvas.getContext('2d');
            const cw = canvas.width;
            const ch = canvas.height;
            const cx = cw / 2;
            const cy = ch / 2;
            const radius = cx;
            const sliceAngle = (2 * Math.PI) / pool.length;

            const colors = ['#FF3B30', '#FF9500', '#FFCC00', '#4CD964', '#5AC8FA', '#007AFF', '#5856D6', '#FF2D55'];

            ctx.clearRect(0, 0, cw, ch);
            pool.forEach((item, i) => {
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, radius, i * sliceAngle, (i + 1) * sliceAngle);
                ctx.closePath();
                ctx.fillStyle = colors[i % colors.length];
                ctx.fill();

                ctx.lineWidth = 4;
                ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--card-bg');
                ctx.stroke();

                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(i * sliceAngle + sliceAngle / 2);
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#FFFFFF';
                const fontSize = item.name.length > 5 ? 24 : 36;
                ctx.font = `bold ${fontSize}px -apple-system`;
                ctx.fillText(item.name, radius - 30, 0);
                ctx.restore();
            });
            canvas.style.transform = `rotate(0deg)`;
            canvas.dataset.currentRotate = 0;
        },
        execute: (zone, pool) => {
            const canvas = document.getElementById('wheelCanvas');
            const res = document.getElementById('wheelResult');
            res.style.opacity = 0;

            const winnerIdx = Math.floor(Math.random() * pool.length);
            const winner = pool[winnerIdx].name;
            
            const sliceDeg = 360 / pool.length;
            const targetCenterDeg = (winnerIdx * sliceDeg) + (sliceDeg / 2);
            
            let currentRotate = parseFloat(canvas.dataset.currentRotate || 0);
            const extraSpins = (5 + Math.floor(Math.random() * 4)) * 360; 
            const baseRotate = 270 - targetCenterDeg;
            
            let finalRotate = currentRotate + extraSpins;
            const remainder = finalRotate % 360;
            finalRotate = finalRotate - remainder + baseRotate;
            
            if (finalRotate < currentRotate + extraSpins) {
                finalRotate += 360;
            }

            canvas.style.transform = `rotate(${finalRotate}deg)`;
            canvas.dataset.currentRotate = finalRotate;

            setTimeout(() => {
                res.innerText = `決定是：${winner}！`;
                res.style.opacity = 1;
                setUIState(false);
            }, 4000);
        }
    }
];

// ================= UI 資料與主題綁定 =================

let selectedNewBudget = '$$';
document.querySelectorAll('#addBudgetSelector .budget-btn').forEach(btn => {
    btn.onclick = function() {
        document.querySelectorAll('#addBudgetSelector .budget-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        selectedNewBudget = this.dataset.val;
    };
});

// 修正 Bug：使用精準的 dataset.filter 進行比對
function setFilter(budget) {
    if(isAnimating) return;
    currentFilter = budget;
    
    document.querySelectorAll('#budgetFilterBar .filter-tab').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === budget) {
            btn.classList.add('active');
        }
    });
    
    setupCurrentMethod();
}

// 動態修改單個項目的預算並重繪
function changeBudget(index, newBudget) {
    if (isAnimating) return;
    foods[index].budget = newBudget;
    renderFoods(); 
}

// 渲染左側食物清單：加入即時修改小按鈕
function renderFoods() {
    const list = document.getElementById('foodList');
    list.innerHTML = '';
    foods.forEach((food, index) => {
        const li = document.createElement('li');
        li.className = 'food-item';
        
        // 判斷按鈕的激活狀態
        const s1 = food.budget === '$' ? 'active' : '';
        const s2 = food.budget === '$$' ? 'active' : '';
        const s3 = food.budget === '$$$' ? 'active' : '';

        li.innerHTML = `
            <span class="food-name">${food.name}</span>
            <div class="inline-budget-group">
                <button class="inline-budget-btn ${s1}" onclick="changeBudget(${index}, '$')">$</button>
                <button class="inline-budget-btn ${s2}" onclick="changeBudget(${index}, '$$')">$$</button>
                <button class="inline-budget-btn ${s3}" onclick="changeBudget(${index}, '$$$')">$$$</button>
            </div>
            <button class="delete-btn" onclick="removeFood(${index})">刪除</button>
        `;
        list.appendChild(li);
    });
    localStorage.setItem('dinnerFoods', JSON.stringify(foods));
    setupCurrentMethod(); // 自動刷新目前的遊戲過濾器狀態
}

function addFood() {
    const input = document.getElementById('foodInput');
    const val = input.value.trim();
    if (val) {
        foods.push({ name: val, budget: selectedNewBudget });
        input.value = '';
        renderFoods();
    }
}

function removeFood(index) {
    if (isAnimating) return;
    foods.splice(index, 1);
    renderFoods();
}

document.getElementById('foodInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') addFood();
});

// 遊戲方法切換
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
    setupCurrentMethod();
}

function switchMethod(index) {
    currentMethodIndex = index;
    renderMethods();
}

function setupCurrentMethod() {
    const method = methods[currentMethodIndex];
    const zone = document.getElementById('interactiveZone');
    const actionBtn = document.getElementById('actionBtn');
    
    const pool = getFilteredFoods();

    if (pool.length === 0) {
        zone.innerHTML = `<div class="empty-state">目前此預算內沒有食物，請先新增！</div>`;
        actionBtn.innerText = '名單為空';
        actionBtn.disabled = true;
        actionBtn.onclick = null;
        return;
    }

    actionBtn.disabled = false;
    method.setupUI(zone, pool);
    actionBtn.innerText = `開始 ${method.name.split(' ')[1]}`;
    actionBtn.onclick = () => { 
        if (!isAnimating) {
            setUIState(true);
            method.execute(zone, pool); 
        }
    };
}

// ================= 深淺色模式與動態狀態欄 (PWA 優化) =================
const themeCheckbox = document.getElementById('themeCheckbox');
const modeText = document.getElementById('modeText');
const themeColorMeta = document.getElementById('themeColorMeta'); 

// 修改：將操作對象改為 document.documentElement (即 html 標籤)
const html = document.documentElement; 
const currentTheme = localStorage.getItem('theme');

// 初始化時判斷深色模式
if (currentTheme === 'dark') {
    html.classList.add('dark-mode');
    themeCheckbox.checked = true;
    modeText.innerText = 'Dark mode';
    if (themeColorMeta) themeColorMeta.setAttribute('content', '#1C1C1E'); // 深色狀態欄
} else {
    if (themeColorMeta) themeColorMeta.setAttribute('content', '#F5F5F7'); // 淺色狀態欄
}

// 監聽開關切換
themeCheckbox.addEventListener('change', function() {
    if (this.checked) {
        html.classList.add('dark-mode');
        modeText.innerText = 'Dark mode';
        localStorage.setItem('theme', 'dark');
        if (themeColorMeta) themeColorMeta.setAttribute('content', '#1C1C1E'); // 切換為深色狀態欄
    } else {
        html.classList.remove('dark-mode');
        modeText.innerText = 'Light mode';
        localStorage.setItem('theme', 'light');
        if (themeColorMeta) themeColorMeta.setAttribute('content', '#F5F5F7'); // 切換為淺色狀態欄
    }
});

renderFoods();
renderMethods();
// ================= PWA Service Worker 註冊 =================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('ServiceWorker 註冊成功，範圍為: ', registration.scope);
            })
            .catch(err => {
                console.log('ServiceWorker 註冊失敗: ', err);
            });
    });
}