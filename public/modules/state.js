export const state = {
    allArtists: [],
    currentFilteredData: [],
    currentEditRowIndex: null,
    scannedMatches: [],
    fetchedSyncContacts: [],
    mailingRecipients: [],
    recentlyImportedEmails: new Set(),
    importFilterActive: false,
    previousReserveList: [],
};

export const isTrue = (val) => {
    return String(val).toLowerCase() === 'ja' || val === true || val === 'TRUE';
};