const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

const SCOPES = ['https://www.googleapis.com/auth/drive'];

function getAuth() {
  if (process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET && process.env.GOOGLE_OAUTH_REFRESH_TOKEN) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
    return oauth2Client;
  }

  let authOptions = { scopes: SCOPES };
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    authOptions.credentials = {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  } else if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      authOptions.credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    } catch (error) {
      console.error('FOUT: Kon GOOGLE_CREDENTIALS_JSON niet parsen in Drive auth.', error);
    }
  } else {
    authOptions.keyFile = path.join(__dirname, 'google-credentials.json');
  }

  return new google.auth.GoogleAuth(authOptions);
}

function getDriveClient() {
  return google.drive({ version: 'v3', auth: getAuth() });
}

// Proxy object zodat drive.files.list / drive.files.create altijd de meest recente auth gebruikt
const driveProxy = new Proxy({}, {
  get(target, prop) {
    const client = getDriveClient();
    const value = client[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

async function getSubFolders(folderId) {
  try {
    const client = getDriveClient();
    const response = await client.files.list({
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

module.exports = { drive: driveProxy, getSubFolders, getDriveClient };