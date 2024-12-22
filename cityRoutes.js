const express = require('express');
const db = require('./db');  // Ensure this points to your MySQL connection setup

const router = express.Router();

// Route to fetch unique cities
router.get('/api/cities', (req, res) => {
    console.log("[DEBUG] Fetching unique cities from the database...");

    const sqlQuery = `SELECT DISTINCT city FROM Areas`;

    db.query(sqlQuery, (err, results) => {
        if (err) {
            console.error("[ERROR] Database query failed:", err);
            return res.status(500).json({ error: 'Database query failed' });
        }

        console.log("[DEBUG] Retrieved cities:", results);
        res.json(results);  // Send the list of cities as JSON
    });
});

const moment = require('moment-timezone');

router.get('/api/get-buses', (req, res) => {
    const { departureCity, destinationCity } = req.query;

    console.log("[DEBUG] get-buses route accessed with departureCity:", departureCity, "and destinationCity:", destinationCity);

    if (!departureCity || !destinationCity) {
        console.error("[ERROR] Missing required cities in the query parameters.");
        return res.status(400).json({ error: 'Both departure and destination cities are required.' });
    }

    const query = `
        SELECT 
            v.vehicle_id, v.license_plate, v.status, 
            r.route_name, r.route_id, v.remaining_capacity,
            ics.departure_time, ics.arrival_time, 
            ics.fare, ics.distance
        FROM InterCitySchedules ics
        JOIN Routes r ON ics.route_id = r.route_id
        JOIN Vehicles v ON ics.vehicle_id = v.vehicle_id
        WHERE r.origin_city = ? AND r.destination_city = ?
    `;

    db.query(query, [departureCity, destinationCity], (error, results) => {
        if (error) {
            console.error("[ERROR] Query execution failed:", error);
            return res.status(500).json({ error: 'Internal server error' });
        }

        console.log("[DEBUG] Retrieved buses:", results);

        // Convert times to local time (Asia/Karachi)
        const convertedResults = results.map((bus) => {
            console.log("[DEBUG] Converting times for bus:", bus.vehicle_id);
            return {
                ...bus,
                departure_time: moment.utc(bus.departure_time).tz('Asia/Karachi').format('YYYY-MM-DD HH:mm:ss'),
                arrival_time: moment.utc(bus.arrival_time).tz('Asia/Karachi').format('YYYY-MM-DD HH:mm:ss')
            };
        });

        console.log("[DEBUG] Converted bus data with local times:", convertedResults);
        res.json(convertedResults);  // Send the result to the front-end
    });
});

// Example Express route to fetch route details
router.get('/api/get-route-details', (req, res) => {
    const routeId = req.query.routeId;

    console.log("[DEBUG] Fetching route details for routeId:", routeId);

    const query = `
        SELECT r.route_name, rs.stop_order, a.area_name, a.latitude, a.longitude
        FROM Routes r
        JOIN RouteStops rs ON r.route_id = rs.route_id
        JOIN Areas a ON rs.stop_id = a.area_id
        WHERE r.route_id = ? 
        ORDER BY rs.stop_order;
    `;

    db.query(query, [routeId], (err, results) => {
        if (err) {
            console.error("[ERROR] Database error:", err);
            return res.status(500).json({ error: 'Database error' });
        }

        console.log("[DEBUG] Retrieved route details:", results);
        res.json(results);
    });
});

module.exports = router;
