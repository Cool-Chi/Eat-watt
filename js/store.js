// js/store.js

export const state = {
    activeBudgets: ['$', '$$', '$$$'],
    listData: [],
    currentMethodIndex: 0,
    isAnimating: false,
    sortableInstances: [],
    selectedNewBudget: '$$',
    isDraggingGlobal: false
};

// 資料載入與向下相容處理
const savedTree = localStorage.getItem('dinnerFoodsTree');
if (savedTree) {
    state.listData = JSON.parse(savedTree);
} else {
    const savedLegacy = JSON.parse(localStorage.getItem('dinnerFoods'));
    if (savedLegacy && savedLegacy.length > 0) {
        state.listData = savedLegacy.map((f, i) => ({
            id: 'food-' + Date.now() + i, type: 'food',
            name: typeof f === 'string' ? f : f.name, budget: f.budget || '$$'
        }));
    } else {
        state.listData = [
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

export function saveData() { 
    localStorage.setItem('dinnerFoodsTree', JSON.stringify(state.listData)); 
}