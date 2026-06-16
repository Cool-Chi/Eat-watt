// js/ui/picker.js
import { state, saveData } from '../store.js';
import { renderFoods } from './render.js';

export const ALLOWED_EMOJIS = ['📁', '🍱', '🍜', '🍔', '🍕', '🥗', '🥩', '🍰', '☕', '🔥', '🌟', '❤️'];

export function initEmojiPicker() {
    if (document.getElementById('emojiPicker')) return;
    const picker = document.createElement('div');
    picker.id = 'emojiPicker';
    picker.className = 'emoji-picker hidden';
    document.body.appendChild(picker);

    document.addEventListener('click', (e) => {
        if (!picker.classList.contains('hidden') && !picker.contains(e.target) && !e.target.closest('.folder-emoji')) {
            picker.classList.add('hidden');
        }
    });
}
initEmojiPicker();

export function openEmojiPicker(folderId, triggerElement, event) {
    event.stopPropagation();
    const picker = document.getElementById('emojiPicker');
    const rect = triggerElement.getBoundingClientRect();

    picker.innerHTML = '';
    ALLOWED_EMOJIS.forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = 'emoji-btn';
        btn.innerText = emoji;
        btn.onclick = (e) => {
            e.stopPropagation();
            const update = (nodes) => {
                for (let n of nodes) {
                    if (n.id === folderId) { n.emoji = emoji; return true; }
                    if (n.type === 'folder' && update(n.items)) return true;
                }
            };
            update(state.listData);
            saveData();
            renderFoods();
            picker.classList.add('hidden');
        };
        picker.appendChild(btn);
    });

    picker.style.top = `${rect.bottom + window.scrollY + 8}px`;
    picker.style.left = `${rect.left + window.scrollX}px`;
    picker.classList.remove('hidden');
}