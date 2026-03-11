const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
let authOptions = { scopes: SCOPES };

if (process.env.GOOGLE_CREDENTIALS_JSON) {
  try {
    authOptions.credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  } catch (error) {
    console.error('FOUT: Kon GOOGLE_CREDENTIALS_JSON niet parsen.', error);
  }
}

if (!authOptions.credentials) {
  authOptions.keyFile = path.join(__dirname, 'google-credentials.json');
}

const auth = new google.auth.GoogleAuth(authOptions);

const drive = google.drive({ version: 'v3', auth });

async function getSubFolders(folderId) {
  try {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, webViewLink)',
    });
    return response.data.files;
  } catch (error) {
    console.error('Fout bij ophalen submappen Drive:', error);
    throw error;
  }
}

module.exports = { getSubFolders };