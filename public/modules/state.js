export const state = {
    allArtists: [],
    currentFilteredData: [],
    currentEditRowIndex: null,
    scannedMatches: [],
    fetchedSyncContacts: [],
    mailingRecipients: [],
};

export const isTrue = (val) => {
    return String(val).toLowerCase() === 'ja' || val === true || val === 'TRUE';
};