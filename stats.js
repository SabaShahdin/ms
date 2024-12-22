const express = require('express');
const db = require('./db');  
const router = express.Router();

// Endpoint to get the count of distinct cities
router.get('/city-count', (req, res) => {
    const sqlQuery = `SELECT COUNT(DISTINCT city) AS cityCount FROM Areas`;

    db.query(sqlQuery, (err, results) => {
        if (err) {
            console.error("[ERROR] Database query failed:", err);
            return res.status(500).json({ error: 'Database query failed' });
        }
        console.log("[DEBUG] Retrieved city count:", results[0].cityCount);
        res.json({ cityCount: results[0].cityCount }); // Send the count as JSON
    });
});
// Endpoint to get the count of distinct cities
router.get('/passenger-count', (req, res) => {
    const sqlQuery = `SELECT COUNT(passenger_id) AS passengerCount FROM passengers`;

    db.query(sqlQuery, (err, results) => {
        if (err) {
            console.error("[ERROR] Database query failed:", err);
            return res.status(500).json({ error: 'Database query failed' });
        }
        console.log("[DEBUG] Retrieved passenger count:", results[0].passengerCount);
        res.json({ passengerCount: results[0].passengerCount }); // Send the count as JSON
    });
});
// Endpoint to get the count of distinct cities
router.get('/vehicles-count', (req, res) => {
    const sqlQuery =`SELECT COUNT(vehicle_id) AS vehicleCount 
    FROM vehicles 
    WHERE status != 'Inactive'`;
    ;

    db.query(sqlQuery, (err, results) => {
        if (err) {
            console.error("[ERROR] Database query failed:", err);
            return res.status(500).json({ error: 'Database query failed' });
        }
        console.log("[DEBUG] Retrieved vehicle count:", results[0].vehicleCount);
        res.json({ vehicleCount: results[0].vehicleCount }); // Send the count as JSON
    });
});

router.get('/driver-count', (req, res) => {
    const sqlQuery = `SELECT COUNT(driver_id) AS driverCount FROM drivers`;

    db.query(sqlQuery, (err, results) => {
        if (err) {
            console.error("[ERROR] Database query failed:", err);
            return res.status(500).json({ error: 'Database query failed' });
        }
        console.log("[DEBUG] Retrieved drivers count:", results[0].driverCount);
        res.json({ driverCount: results[0].driverCount }); // Send the count as JSON
    });
});

// Endpoint to get the count of passengers for a specific driver
router.get('/passenger/:driverId', (req, res) => {
    const driverId = req.params.driverId;

    // SQL query to get the count of passengers for a driver's rides
    const sqlQuery = `
        SELECT COUNT(DISTINCT rides.passenger_id) AS passengerCount 
        FROM rides 
        JOIN vehicles ON rides.vehicle_id = vehicles.vehicle_id 
        WHERE vehicles.driver_id = ?;
    `;

    db.query(sqlQuery, [driverId], (err, results) => {
        if (err) {
            console.error("[ERROR] Database query failed:", err);
            return res.status(500).json({ error: 'Database query failed' });
        }
        console.log("[DEBUG] Retrieved passenger count:", results[0].passengerCount);
        res.json({ passengerCount: results[0].passengerCount }); // Send the count as JSON
    });
});

// Endpoint to get the count of passengers for a specific driver
router.get('/ride/:driverId', (req, res) => {
    const driverId = req.params.driverId;
    // SQL query to get the count of passengers for a driver's rides
    const sqlQuery = `
        SELECT COUNT(DISTINCT rides.ride_id) AS rideCount 
        FROM rides 
        JOIN vehicles ON rides.vehicle_id = vehicles.vehicle_id 
        WHERE vehicles.driver_id = ?;
    `;

    db.query(sqlQuery, [driverId], (err, results) => {
        if (err) {
            console.error("[ERROR] Database query failed:", err);
            return res.status(500).json({ error: 'Database query failed' });
        }
        console.log("[DEBUG] Retrieved passenger count:", results[0].rideCount);
        res.json({ rideCount: results[0].rideCount }); // Send the count as JSON
    });
});
// Endpoint to get the count of passengers for a specific driver
router.get('/ride-status/:driverId', (req, res) => {
    const driverId = req.params.driverId;
    // SQL query to get the count of passengers for a driver's rides
    const sqlQuery = `
        SELECT COUNT(DISTINCT rides.ride_id) AS ridestatus
        FROM rides 
        JOIN vehicles ON rides.vehicle_id = vehicles.vehicle_id 
        WHERE vehicles.driver_id = ? and rides.status = 'pending';
    `;

    db.query(sqlQuery, [driverId], (err, results) => {
        if (err) {
            console.error("[ERROR] Database query failed:", err);
            return res.status(500).json({ error: 'Database query failed' });
        }
        console.log("[DEBUG] Retrieved passenger count:", results[0].ridestatus);
        res.json({ ridestatus: results[0].ridestatus }); // Send the count as JSON
    });
});
// Endpoint to get the count of passengers for a specific driver
router.get('/fare/:driverId', (req, res) => {
    const driverId = req.params.driverId;
    // SQL query to get the count of passengers for a driver's rides
    const sqlQuery = `
        SELECT SUM(rides.fare) AS fare
        FROM rides 
        JOIN vehicles ON rides.vehicle_id = vehicles.vehicle_id 
        WHERE vehicles.driver_id = ? ;
    `;

    db.query(sqlQuery, [driverId], (err, results) => {
        if (err) {
            console.error("[ERROR] Database query failed:", err);
            return res.status(500).json({ error: 'Database query failed' });
        }
        console.log("[DEBUG] Retrieved passenger count:", results[0].fare);
        res.json({fare: results[0].fare}); // Send the count as JSON
    });
});
router.get('/api/get-user', (req, res) => {
    console.log("Received Request:", req.query);

    // Get the user_id from the query parameters
    const userId = req.query.user_id;

    if (!userId) {
        console.error("[ERROR] Missing user_id in request");
        return res.status(400).json({ error: 'Missing user_id parameter' });
    }

    // Modify the SQL query to select passenger_id based on the provided user_id
    const sqlQuery = `
        SELECT passenger_id, fare
        FROM passengers
        WHERE user_id = ?  -- Ensure the correct column name to match your query
    `;

    db.query(sqlQuery, [userId], (err, results) => {
        if (err) {
            console.error("[ERROR] Database query failed:", err);
            return res.status(500).json({ error: 'Database query failed' });
        }

        if (results.length === 0) {
            console.warn("[WARNING] No passenger found with the given user_id");
            return res.status(404).json({ error: 'Passenger not found' });
        }

        console.log("[DEBUG] Retrieved fare:", results[0].fare);
        res.json({ passenger_id: results[0].passenger_id, fare: results[0].fare }); // Sending both passenger_id and fare
    });
});

module.exports = router;
