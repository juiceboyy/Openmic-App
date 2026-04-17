let draggedEl = null;
let mainSnap = null;
let reserveSnap = null;

export function setSnapshots(main, reserve) {
    mainSnap = [...main];
    reserveSnap = [...reserve];
}

export function handleDragStart(event, index, list) {
    draggedEl = event.target.closest('.draggable-item');
    event.dataTransfer.effectAllowed = 'move';
    setTimeout(() => draggedEl?.classList.add('opacity-40', 'scale-95'), 0);
}

export function handleDragOver(event) {
    event.preventDefault();
    if (!draggedEl) return;
    event.dataTransfer.dropEffect = 'move';

    const target = event.target.closest('.draggable-item');
    if (!target || target === draggedEl) return;
    if (target.parentElement !== draggedEl.parentElement) return;

    const { top, height } = target.getBoundingClientRect();
    if (event.clientY < top + height / 2) {
        if (target.previousElementSibling !== draggedEl) target.before(draggedEl);
    } else {
        if (target.nextElementSibling !== draggedEl) target.after(draggedEl);
    }
}

export function handleDragEnter(event) {
    event.preventDefault();
    event.currentTarget.classList.add('border-blue-400', 'bg-blue-50/50');
}

export function handleDragLeave(event) {
    event.currentTarget.classList.remove('border-blue-400', 'bg-blue-50/50');
}

export function handleDragEnd(event) {
    event.target.classList.remove('opacity-40', 'scale-95');
    draggedEl = null;
}

export function rebuildFromDOM(mainContainer, reserveContainer) {
    const newMain = [];
    const newReserve = [];

    for (const child of mainContainer.children) {
        if (child.classList.contains('pauze-divider')) continue;
        if (child.classList.contains('draggable-item')) {
            const srcList = child.dataset.list;
            const srcIndex = parseInt(child.dataset.index, 10);
            newMain.push(srcList === 'main' ? mainSnap[srcIndex] : reserveSnap[srcIndex]);
        } else {
            newMain.push(null);
        }
    }

    for (const child of reserveContainer.children) {
        if (!child.classList.contains('draggable-item')) continue;
        const srcList = child.dataset.list;
        const srcIndex = parseInt(child.dataset.index, 10);
        newReserve.push(srcList === 'main' ? mainSnap[srcIndex] : reserveSnap[srcIndex]);
    }

    return { newMain, newReserve };
}

// Cross-list: reserve → main slot (or main → main slot, ignored)
export function processDropOnMain(targetIndex, currentLineup, reserveLineup) {
    if (!draggedEl) return false;
    const srcList = draggedEl.dataset.list;
    const srcIndex = parseInt(draggedEl.dataset.index, 10);

    if (srcList === 'reserve') {
        const reserveItem = reserveLineup[srcIndex];
        const mainItem = currentLineup[targetIndex];
        currentLineup[targetIndex] = reserveItem;
        reserveLineup.splice(srcIndex, 1);
        if (mainItem) reserveLineup.push(mainItem);
        return true;
    }
    return false;
}

// Cross-list: main → reserve container
export function processDropOnReserve(currentLineup, reserveLineup) {
    if (!draggedEl) return false;
    const srcList = draggedEl.dataset.list;
    const srcIndex = parseInt(draggedEl.dataset.index, 10);

    if (srcList === 'main') {
        const item = currentLineup[srcIndex];
        if (item) { reserveLineup.push(item); currentLineup[srcIndex] = null; }
        return true;
    }
    return false;
}

export const resetDraggedItem = () => { draggedEl = null; mainSnap = null; reserveSnap = null; };
