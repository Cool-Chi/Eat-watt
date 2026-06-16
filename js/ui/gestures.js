// js/ui/gestures.js
import { state } from '../store.js';

export function bindSwipe(wrapperEl, frontEl, id, isFolder) {
    let startX = 0, startY = 0, currentX = 0;
    let isSwiping = false, isVertical = false, isMouseDown = false;
    let currentTranslate = 0; 

    const startHandler = (e) => {
        e.stopPropagation(); 
        
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