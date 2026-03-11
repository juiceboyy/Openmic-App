let draggedItem = null; // { list: 'main'|'reserve', index: 0 }

export function handleDragStart(event, index, sourceList) {
    draggedItem = { list: sourceList, index: index };
    event.dataTransfer.effectAllowed = 'move';
    setTimeout(() => event.target.classList.add('opacity-40', 'scale-95'), 0);
}

export function handleDragOver(event) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }

export function handleDragEnter(event) {
    event.preventDefault();
    event.currentTarget.classList.add('border-blue-400', 'bg-blue-50/50');
}

export function handleDragLeave(event) {
    event.currentTarget.classList.remove('border-blue-400', 'bg-blue-50/50');
}

export function handleDragEnd(event) {
    event.target.classList.remove('opacity-40', 'scale-95');
    draggedItem = null;
}

export function processDropOnMain(targetIndex, currentLineup, reserveLineup) {
    if (!draggedItem) return false;
    if (draggedItem.list === 'main') {
        if (draggedItem.index === targetIndex) return false;
        [currentLineup[targetIndex], currentLineup[draggedItem.index]] = [currentLineup[draggedItem.index], currentLineup[targetIndex]];
    } else if (draggedItem.list === 'reserve') {
        const reserveItem = reserveLineup[draggedItem.index];
        const mainItem = currentLineup[targetIndex];
        currentLineup[targetIndex] = reserveItem;
        reserveLineup.splice(draggedItem.index, 1);
        if (mainItem) reserveLineup.push(mainItem);
    }
    return true;
}

export function processDropOnReserve(currentLineup, reserveLineup) {
    if (!draggedItem) return false;
    if (draggedItem.list === 'main') {
        const item = currentLineup[draggedItem.index];
        if (item) { reserveLineup.push(item); currentLineup[draggedItem.index] = null; }
    }
    return true;
}
export const resetDraggedItem = () => { draggedItem = null; };