// js/games.js
import { state } from './store.js';

export const methods = [
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
        execute: (zone, pool, setUIState) => {
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
        execute: (zone, pool, setUIState) => {
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
        execute: (zone, pool, setUIState) => {
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
                            if (!state.isAnimating) return; // 使用 state
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
        execute: (zone, pool, setUIState) => {
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