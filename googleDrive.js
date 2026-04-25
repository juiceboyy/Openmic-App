const { google } = require('googleapis');
require('dotenv').config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });

const drive = google.drive({ version: 'v3', auth: oauth2Client });

async function getSubFolders(folderId) {
  try {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, webViewLink)',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true
    });
    return response.data.files;
  } catch (error) {
    console.error('Fout bij ophalen submappen Drive:', error);
    throw error;
  }
}

module.exports = { drive, getSubFolders };