let draggedEl = null;
let mainSnap = null;
let reserveSnap = null;
let candidateSnap = null;

export function setSnapshots(main, reserve, candidates) {
    mainSnap = [...main];
    reserveSnap = [...reserve];
    candidateSnap = [...(candidates || [])];
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

export function rebuildFromDOM(mainContainer, reserveContainer, candidateContainer) {
    const newMain = [];
    const newReserve = [];
    const newCandidates = [];

    const getItemFromSnap = (list, index) => {
        if (list === 'main') return mainSnap[index];
        if (list === 'reserve') return reserveSnap[index];
        if (list === 'candidates') return candidateSnap[index];
        return null;
    };

    for (const child of mainContainer.children) {
        if (child.classList.contains('pauze-divider')) continue;
        if (child.classList.contains('draggable-item')) {
            const srcList = child.dataset.list;
            const srcIndex = parseInt(child.dataset.index, 10);
            newMain.push(getItemFromSnap(srcList, srcIndex));
        } else {
            newMain.push(null);
        }
    }

    for (const child of reserveContainer.children) {
        if (!child.classList.contains('draggable-item')) continue;
        const srcList = child.dataset.list;
        const srcIndex = parseInt(child.dataset.index, 10);
        newReserve.push(getItemFromSnap(srcList, srcIndex));
    }

    if (candidateContainer) {
        for (const child of candidateContainer.children) {
            if (!child.classList.contains('draggable-item')) continue;
            const srcList = child.dataset.list;
            const srcIndex = parseInt(child.dataset.index, 10);
            newCandidates.push(getItemFromSnap(srcList, srcIndex));
        }
    }

    return { newMain, newReserve, newCandidates };
}

// Cross-list: reserve/candidates → main slot
export function processDropOnMain(targetIndex, currentLineup, reserveLineup, candidatePool) {
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
    } else if (srcList === 'candidates') {
        const candidateItem = candidatePool[srcIndex];
        const mainItem = currentLineup[targetIndex];
        currentLineup[targetIndex] = candidateItem;
        candidatePool.splice(srcIndex, 1);
        if (mainItem) candidatePool.push(mainItem);
        return true;
    }
    return false;
}

// Cross-list: main/candidates → reserve container
export function processDropOnReserve(currentLineup, reserveLineup, candidatePool) {
    if (!draggedEl) return false;
    const srcList = draggedEl.dataset.list;
    const srcIndex = parseInt(draggedEl.dataset.index, 10);

    if (srcList === 'main') {
        const item = currentLineup[srcIndex];
        if (item) { reserveLineup.push(item); currentLineup[srcIndex] = null; }
        return true;
    } else if (srcList === 'candidates') {
        const item = candidatePool[srcIndex];
        if (item) { reserveLineup.push(item); candidatePool.splice(srcIndex, 1); }
        return true;
    }
    return false;
}

// Cross-list: main/reserve → candidate container
export function processDropOnCandidate(currentLineup, reserveLineup, candidatePool) {
    if (!draggedEl) return false;
    const srcList = draggedEl.dataset.list;
    const srcIndex = parseInt(draggedEl.dataset.index, 10);

    if (srcList === 'main') {
        const item = currentLineup[srcIndex];
        if (item) { candidatePool.push(item); currentLineup[srcIndex] = null; }
        return true;
    } else if (srcList === 'reserve') {
        const item = reserveLineup[srcIndex];
        if (item) { candidatePool.push(item); reserveLineup.splice(srcIndex, 1); }
        return true;
    }
    return false;
}

export const resetDraggedItem = () => { draggedEl = null; mainSnap = null; reserveSnap = null; candidateSnap = null; };
