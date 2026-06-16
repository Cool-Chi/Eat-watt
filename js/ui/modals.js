// js/ui/modals.js
import { state, saveData } from '../store.js';
import { renderFoods } from './render.js';

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