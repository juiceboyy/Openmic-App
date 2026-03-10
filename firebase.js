// firebase.js
const admin = require('firebase-admin');

// We laden hier jouw geheime 'huissleutel' in
const serviceAccount = require('./firebase-key.json');

// We initialiseren de verbinding met Google
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// We maken een handige snelkoppeling naar de Firestore database
const db = admin.firestore();

// We exporteren de 'db' variabele, zodat andere bestanden (zoals server.js) 
// deze kunnen gebruiken om met de database te praten.
module.exports = { db };