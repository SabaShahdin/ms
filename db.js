// db.js
const mysql = require('mysql2');

// Create MySQL connection
const db = mysql.createConnection({
  host: 'bsgwvorjludkbs0uuicz-mysql.services.clever-cloud.com',  // Host
  user: 'uufts5ed2wn5ifxe',                                       // User
  password: 'VYLKeg1KRMklflokOa0o',                               // Password
  database: 'bsgwvorjludkbs0uuicz',                               // Database name
  port: 3306                                                      // Port
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.message);
    process.exit(1); // Exit the process if there is an error
  }
  console.log('Connected to MySQL!');
});

// Export the db connection to be used in other files
module.exports = db;
