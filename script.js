// ================= 全局狀態與資料遷移 (支援資料夾結構) =================
let currentFilter = 'all'; 
let foods = [];
let savedFoods = JSON.parse(localStorage.getItem('dinnerFoods'));

// 產生唯一 ID 的輔助函式
function generateId() { return 'id-' + Math.random().toString(36).substr(2, 9); }

// 向下相容處理：將舊版扁平陣列，升級為具備 ID 的新結構
if (savedFoods && savedFoods.length > 0) {
    if (typeof savedFoods[0] === 'string') {
        foods = savedFoods.map(name => ({ id: generateId(), type: 'item', name: name, budget: '$$' })); 
    } else {
        // 如果舊版已經是物件，但沒有 id 或 type，幫它補上
        foods = savedFoods.map(item => ({
            id: item.id || generateId(),
            type: item.type || 'item',
            name: item.name,
            budget: item.budget || '$$',
            isOpen: item.isOpen !== undefined ? item.isOpen : true,
            children: item.children || []
        }));
    }
} else {
    // 預設資料 (展示資料夾功能)
    foods = [
        { id: generateId(), type: 'item', name: '拉麵', budget: '$$' },
        { 
            id: generateId(), type: 'folder', name: '速食控', isOpen: true, 
            children: [
                { id: generateId(), type: 'item', name: '麥當勞', budget: '$' },
                { id: generateId(), type: 'item', name: '鹹酥雞', budget: '$' }
            ] 
        },
        { id: generateId(), type: 'item', name: '火鍋', budget: '$$$' }
    ];
}

let currentMethodIndex = 0;
let isAnimating = false;

function setUIState(disabled) {
    isAnimating = disabled;
    document.getElementById('actionBtn').disabled = disabled;
    document.getElementById('foodInput').disabled = disabled;
    document.getElementById('addBtn').disabled = disabled;
    document.getElementById('addFolderBtn').disabled = disabled;
    document.querySelectorAll('.method-tab, .filter-tab, .budget-btn, .delete-icon-btn, .inline-budget-btn').forEach(btn => btn.disabled = disabled);
}

// ================= 資料提取與遊戲引擎適配 =================
// 遊戲引擎需要一個「攤平」的名單。此函式會遞迴遍歷資料夾，將有效項目抽出。
function getFilteredFoods() {
    let pool = [];
    function extract(items) {
        items.forEach(item => {
            if (item.type === 'folder') {
                extract(item.children); // 進入資料夾遞迴
            } else {
                if (currentFilter === 'all' || item.budget === currentFilter) {
                    pool.push(item);
                }
            }
        });
    }
    extract(foods);
    return pool;
}

// ================= 互動遊戲核心邏輯 (Methods) =================
// (維持你現有的四種遊戲設定，無需修改，為了版面簡潔，我這裡省略細節)
// 請把你原本程式碼裡的 const methods = [ {id: 'slot'...}, {id: 'dice'...}, {id: 'card'...}, {id: 'wheel'...} ]; 完整保留在這裡。

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

// ================= UI 資料渲染與 SortableJS 拖曳綁定 =================

let selectedNewBudget = '$$';
document.querySelectorAll('#addBudgetSelector .budget-btn').forEach(btn => {
    btn.onclick = function() {
        document.querySelectorAll('#addBudgetSelector .budget-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        selectedNewBudget = this.dataset.val;
    };
});

function setFilter(budget) {
    if(isAnimating) return;
    currentFilter = budget;
    document.querySelectorAll('#budgetFilterBar .filter-tab').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === budget) btn.classList.add('active');
    });
    setupCurrentMethod();
}

// 核心：從 DOM 結構反向重建 JSON 資料 (確保拖曳後的排序被永久儲存)
function saveStructureFromDOM() {
    const rootNodes = document.getElementById('foodList').children;
    const newData = [];
    
    Array.from(rootNodes).forEach(node => {
        if (node.classList.contains('folder-wrapper')) {
            const childrenNodes = node.querySelector('.folder-content').children;
            const children = Array.from(childrenNodes).map(child => ({
                id: child.dataset.id,
                type: 'item',
                name: child.dataset.name,
                budget: child.dataset.budget
            }));
            newData.push({
                id: node.dataset.id,
                type: 'folder',
                name: node.dataset.name,
                isOpen: node.classList.contains('open'),
                children: children
            });
        } else if (node.classList.contains('food-item')) {
            newData.push({
                id: node.dataset.id,
                type: 'item',
                name: node.dataset.name,
                budget: node.dataset.budget
            });
        }
    });
    
    foods = newData;
    localStorage.setItem('dinnerFoods', JSON.stringify(foods));
    setupCurrentMethod(); // 更新遊戲輪盤陣列
}

// 修改預算 (直接在 DOM 修改後呼叫儲存)
function changeBudget(btn, newBudget) {
    if (isAnimating) return;
    const itemEl = btn.closest('.food-item');
    itemEl.dataset.budget = newBudget;
    
    // 更新按鈕視覺
    const group = btn.parentElement;
    group.querySelectorAll('.inline-budget-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    saveStructureFromDOM();
}

// 刪除節點 (支援刪除卡片或整座資料夾)
function removeNode(btn) {
    if (isAnimating) return;
    const itemEl = btn.closest('.food-item') || btn.closest('.folder-wrapper');
    itemEl.remove(); // 加上 CSS 動畫再 remove 會更好，這裡求穩定直接移除
    saveStructureFromDOM();
}

// 資料夾展開/收合
function toggleFolder(headerEl) {
    const folderEl = headerEl.parentElement;
    folderEl.classList.toggle('open');
    saveStructureFromDOM();
}

// 產生單一項目 DOM 結構
function createItemHTML(item) {
    const s1 = item.budget === '$' ? 'active' : '';
    const s2 = item.budget === '$$' ? 'active' : '';
    const s3 = item.budget === '$$$' ? 'active' : '';
    
    return `
        <div class="food-item" data-id="${item.id}" data-type="item" data-name="${item.name}" data-budget="${item.budget}">
            <span class="item-title">${item.name}</span>
            <div class="inline-budget-group">
                <button class="inline-budget-btn ${s1}" onclick="changeBudget(this, '$')">$</button>
                <button class="inline-budget-btn ${s2}" onclick="changeBudget(this, '$$')">$$</button>
                <button class="inline-budget-btn ${s3}" onclick="changeBudget(this, '$$$')">$$$</button>
            </div>
            <button class="delete-icon-btn" onclick="removeNode(this)">✕</button>
        </div>
    `;
}

// 渲染畫面並綁定拖曳
function renderFoods() {
    const list = document.getElementById('foodList');
    list.innerHTML = '';
    
    foods.forEach(node => {
        if (node.type === 'folder') {
            const folderHtml = `
                <div class="folder-wrapper ${node.isOpen ? 'open' : ''}" data-id="${node.id}" data-type="folder" data-name="${node.name}">
                    <div class="folder-header" onclick="toggleFolder(this)">
                        <span class="folder-icon">▶</span>
                        <span class="item-title">${node.name}</span>
                        <button class="delete-icon-btn" onclick="event.stopPropagation(); removeNode(this)">✕</button>
                    </div>
                    <div class="folder-content-wrapper">
                        <div class="folder-content">
                            ${node.children.map(child => createItemHTML(child)).join('')}
                        </div>
                    </div>
                </div>
            `;
            list.insertAdjacentHTML('beforeend', folderHtml);
        } else {
            list.insertAdjacentHTML('beforeend', createItemHTML(node));
        }
    });

    initSortable(); // 重新綁定拖曳引擎
}

// 啟動 SortableJS 引擎
function initSortable() {
    const commonOptions = {
        group: 'shared', // 允許在根目錄與資料夾之間互相拖曳
        animation: 300,  // FLIP 絲滑排序動畫
        fallbackOnBody: true, // 手機端防滑動衝突
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        onEnd: saveStructureFromDOM // 拖曳放開後立即儲存新結構
    };

    // 1. 綁定根目錄
    new Sortable(document.getElementById('foodList'), {
        ...commonOptions,
        // 防止把資料夾拖進另一個資料夾中 (保持一層結構)
        onMove: function (evt) {
            if (evt.dragged.dataset.type === 'folder' && evt.to.classList.contains('folder-content')) {
                return false; 
            }
        }
    });

    // 2. 綁定所有資料夾內部
    document.querySelectorAll('.folder-content').forEach(container => {
        new Sortable(container, commonOptions);
    });
}

function addFood() {
    const input = document.getElementById('foodInput');
    const val = input.value.trim();
    if (val) {
        foods.push({ id: generateId(), type: 'item', name: val, budget: selectedNewBudget });
        input.value = '';
        renderFoods();
    }
}

function addFolder() {
    const input = document.getElementById('foodInput');
    const val = input.value.trim() || '新資料夾'; // 未輸入則預設名稱
    foods.push({ id: generateId(), type: 'folder', name: val, isOpen: true, children: [] });
    input.value = '';
    renderFoods();
}

document.getElementById('foodInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') addFood();
});

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