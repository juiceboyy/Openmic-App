export const isTrue = (val) => String(val).toLowerCase() === 'ja' || val === true || val === 'TRUE';

export const getEl = (id) => document.getElementById(id);

export const toggleButtonLoading = (btn, isLoading, originalContent) => {
    if (!btn) return;
    btn.disabled = isLoading;
    if (isLoading) {
        const isWhite = btn.classList.contains('text-white');
        const spinnerColor = isWhite ? 'border-white/30 border-t-white' : 'border-current border-t-transparent';
        btn.innerHTML = `<div class="w-4 h-4 border-2 ${spinnerColor} rounded-full animate-spin"></div>`;
    } else {
        btn.innerHTML = originalContent;
    }
};

export const normalize = (str) => (!str || str === '-') ? '' : str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();

export const levenshtein = (a, b) => {
    if (!a.length) return b.length; if (!b.length) return a.length;
    const matrix = Array(b.length + 1).fill(null).map((_, i) => [i]);
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            matrix[i][j] = b[i - 1] === a[j - 1] ? matrix[i - 1][j - 1] : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
        }
    }
    return matrix[b.length][a.length];
};

export const checkSimilarity = (strA, strB) => {
    if (!strA || !strB) return false;
    const normA = normalize(strA);
    const normB = normalize(strB);
    if (!normA || !normB) return false;
    
    // Direct matches or substring matches
    if (normB.includes(normA) || normA.includes(normB)) return true;
    
    // Fuzzy matching for longer words
    if (normA.length > 3 && normB.length > 3) {
        const dist = levenshtein(normA, normB);
                const maxDist = Math.floor(Math.min(normA.length, normB.length) / 3) + 1;
        return dist <= maxDist;
    }
    return false;
};