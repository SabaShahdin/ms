const admin = require('firebase-admin');
const serviceAccount = require('./transport-management-sys-ce9dd-firebase-adminsdk-lg888-a22471874c.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;
