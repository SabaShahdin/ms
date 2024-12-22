const express = require('express');
const db = require('./db'); 
const router = express.Router();


router.get('/areas', (req, res) => {
    const query = 'SELECT area_name FROM Areas'; 
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database query error' });
        }
        res.json(results);
    });
});

module.exports = router;
