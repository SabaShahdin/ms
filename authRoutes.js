const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('./db');
const admin = require('./firebase'); 
const router = express.Router();
const JWT_SECRET = 'sesss';

router.post('/signup', (req, res) => {
  const { username, email, password, contact_number, role } = req.body; // email is now available
  const assignedRole = email.endsWith("@admin.com") ? "Admin" : role || "Passenger";
  
  const insertSql = "INSERT INTO users (username, password, role, email, contact_number, created_at) VALUES (?)";
  const values = [username, password, assignedRole, email, contact_number || null, new Date()];
  
  db.query(insertSql, [values], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ message: "User registered successfully!" });
  });
});

// Sign-in route with JWT
router.post('/signin', (req, res) => {
  const { email, password } = req.body;
  const sql = "SELECT * FROM users WHERE email = ? AND password = ?";
  db.query(sql, [email, password], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (result.length > 0) {
      const user = {
        user_id: result[0].user_id,
        username: result[0].username,
        email: result[0].email,
        role: result[0].role  // Fetch role from the database
      };
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '1d' });
      res.status(200).json({ message: 'Signed in successfully', token, role: user.role }); // Include role in the response
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });
});
router.post('/refresh-token', (req, res) => {
  const { refreshToken } = req.body; // Receive refresh token from client
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }
  // Verify refresh token
  jwt.verify(refreshToken, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    const newToken = jwt.sign({
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role
    }, JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({ message: 'New token generated', newToken });
  });
});
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access denied, token missing!' });
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token or token expired' });
    }
    req.user = user;
    next();
  });
}
// Example of a protected route
router.get('/get-user-data', authenticateToken, (req, res) => {
  res.status(200).json({
    user: req.user,  // The decoded JWT payload
    message: 'User authenticated successfully'
  });
});

// Endpoint to get user info (JWT-based authentication)
router.get('/get-session-user', authenticateToken, (req, res) => {
  res.status(200).json({
    username: req.user.username,
    message: 'User data retrieved successfully'
  });
});

router.post('/check-user', (req, res) => {
  let { username, email, password, contact_number, role } = req.body;
  // Check if the email ends with "@admin"
  if (email.endsWith("@admin.com")) {
    role = "Admin";
  } else {
    role = role || 'Passenger'; // Default to 'Passenger' if no role is provided
  }
  const insertSql = "INSERT INTO users (username, password, role, email, contact_number, created_at) VALUES (?)";
  const values = [username, password, role, email, contact_number || null, new Date()];

  db.query(insertSql, [values], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ message: "User registered successfully!" });
  });
});
// Sign-in route with JWT
router.post('/google-signin', (req, res) => {
  const { email, password } = req.body;
  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (result.length > 0) {
      const user = {
        user_id: result[0].user_id,
        username: result[0].username,
        email: result[0].email,
        role: result[0].role  
      };
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '1d' });
      res.status(200).json({ message: 'Signed in successfully', token, role: user.role }); // Include role in the response
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });
});
router.get('/get-user-id/:username', (req, res) => {
  const { username } = req.params;

  const query = 'SELECT user_id FROM users WHERE username = ?';
  db.query(query, [username], (err, result) => {
    if (err) {
     
      return res.status(500).json({ message: 'Server error' });
    }

    if (result.length > 0) {
      return res.status(200).json({ user_id: result[0].user_id });
    } else {
      return res.status(404).json({ message: 'User not found' });
    }
  });
});
router.get('/fetch-user-data/:username', authenticateToken, (req, res) => {
  const { username } = req.params;

  console.log(`Received request to fetch data for username: ${username}`); // Log the received username

  const query = 'SELECT username, email, contact_number FROM users WHERE username = ?';
  db.query(query, [username], (err, result) => {
    if (err) {
      console.error(`Database error: ${err.message}`); // Log the error message
      return res.status(500).json({ error: 'Server error' });
    }

    console.log(`Query result: `, result); // Log the query result

    if (result.length > 0) {
      console.log(`User data found for username: ${username}`); // Log that data was found
      return res.status(200).json(result[0]); // Return user data
    } else {
      console.log(`No user found for username: ${username}`); // Log that no user was found
      return res.status(404).json({ error: 'User not found' });
    }
  });
});

router.get('/get-driver-id/:username', (req, res) => {
  const { username } = req.params;

  console.log(`Fetching driver ID for username: ${username}`); // Log incoming username

  const query = `
    SELECT d.driver_id 
    FROM Drivers d
    JOIN Users u ON d.user_id = u.user_id
    WHERE u.username = ?
  `;

  db.query(query, [username], (err, result) => {
    if (err) {
      console.error('Error executing query:', err); // Log database query error
      return res.status(500).json({ message: 'Server error', error: err });
    }

    console.log('Query result:', result); // Log the query result

    if (result.length > 0) {
      console.log(`Driver ID found: ${result[0].driver_id}`); // Log the fetched driver ID
      return res.status(200).json({ driver_id: result[0].driver_id });
    } else {
      console.log('Driver not found for the given username'); // Log if no driver was found
      return res.status(404).json({ message: 'Driver not found' });
    }
  });
});


module.exports = 
  router;
