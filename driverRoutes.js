const express = require('express');
const db = require('./db');  // Ensure this points to your MySQL connection setup

const router = express.Router();

router.post('/api/register', (req, res) => {
    const { username, email, password, contact_number, license_number } = req.body;

    console.log('Received registration request:', req.body);  // Debugging message

    // Check if the user already exists
    const checkUserQuery = 'SELECT * FROM Users WHERE email = ?';
    db.query(checkUserQuery, [email], (err, result) => {
        if (err) {
            console.error('Error checking user existence:', err);  // Debugging message
            return res.status(500).json({ message: 'Error checking user existence' });
        }

        if (result.length > 0) {
            console.log('User already exists:', email);  // Debugging message
            return res.status(400).json({ message: 'User already exists' });
        }

        // Set role to 'Driver' automatically
        const role = 'Driver';
        console.log('Setting role as:', role);  // Debugging message

        // Insert user into Users table (without hashing the password)
        const userQuery = 'INSERT INTO Users (username, email, password, contact_number, role) VALUES (?, ?, ?, ?, ?)';
        db.query(userQuery, [username, email, password, contact_number, role], (err, result) => {
            if (err) {
                console.error('Error registering user:', err);  // Debugging message
                return res.status(500).json({ message: 'Error registering user' });
            }

            const userId = result.insertId; // Get the user ID from the inserted row
            console.log('User registered successfully with ID:', userId);  // Debugging message

            // Insert driver details if role is Driver
            const driverQuery = 'INSERT INTO Drivers (user_id, license_number, registration_status) VALUES (?, ?, ?)';
            db.query(driverQuery, [userId, license_number, 'pending'], (err, result) => {
                if (err) {
                    console.error('Error registering driver:', err);  // Debugging message
                    return res.status(500).json({ message: 'Error registering driver' });
                }

                console.log('Driver registration successful, pending admin approval');  // Debugging message
                res.status(200).json({ message: 'Driver registration successful, pending admin approval' });
            });
        });
    });
});

// API to approve a driver
router.post('/api/approve-driver', (req, res) => {
    const { driver_id } = req.body;

    const approveDriverQuery = `
        UPDATE Drivers SET registration_status = 'approved' WHERE driver_id = ?;
    `;

    db.query(approveDriverQuery, [driver_id], (err) => {
        if (err) {
            console.error('Error approving driver:', err);
            return res.status(500).json({ message: 'Error approving driver' });
        }
        else {
            res.json({ message: 'Driver and vehicle approved successfully' });
        }
    });
});

router.post('/api/reject-driver', (req, res) => {
    const { driver_id } = req.body;

    const rejectDriverQuery = `
UPDATE Drivers SET registration_status = 'rejected' WHERE driver_id = ?;
    `;
    db.query(rejectDriverQuery, [driver_id], (err) => {
        if (err) {
            console.error('Error rejecting driver:', err);
            return res.status(500).json({ message: 'Error rejecting driver' });
        }

        else {
            res.json({ message: 'Driver and vehicle rejected successfully' });
        }
    });
});


// Endpoint to get all pending driver requests
router.get('/api/pending-drivers', (req, res) => {
    const query = `
        SELECT 
            d.driver_id,
            u.username AS driver_name,
            u.email AS driver_email,
            u.contact_number,
            d.license_number
        FROM Drivers d JOIN Users u ON d.user_id = u.user_id
        WHERE d.registration_status = 'pending';
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching pending drivers:', err);
            return res.status(500).json({ message: 'Error fetching pending driver requests' });
        }

        res.status(200).json(results);
    });
});


// Register Vehicle Endpoint
router.post('/registerVehicle', (req, res) => {
    const { license_plate, vehicle_type_id, city, area, latitude, longitude, driver_id } = req.body;

    console.log('Received request to register vehicle:', req.body);

    // Fetch vehicle capacity from VehicleTypes table
    const queryCapacity = 'SELECT capacity FROM VehicleTypes WHERE vehicle_type_id = ?';
    db.query(queryCapacity, [vehicle_type_id], (err, result) => {
        if (err) {
            console.error('Error fetching vehicle capacity:', err);
            return res.status(500).send({ message: 'Error fetching vehicle capacity', error: err });
        }

        if (result.length === 0) {
            console.warn('Invalid vehicle type ID:', vehicle_type_id);
            return res.status(400).send({ message: 'Invalid vehicle type ID' });
        }

        const totalCapacity = result[0].capacity;
        console.log('Fetched vehicle capacity:', totalCapacity);

        // Insert vehicle into Vehicles table
        const queryInsert = ` 
            INSERT INTO Vehicles (license_plate, vehicle_type_id, status, gps_latitude, gps_longitude, 
                remaining_capacity, city, driver_id)
            VALUES (?, ?, 'Available', ?, ?, ?, ?, ?)
        `;

        db.query(queryInsert, [
            license_plate, vehicle_type_id, latitude, longitude, totalCapacity, city, driver_id
        ], (err, resultInsert) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    console.warn('Duplicate license plate detected:', license_plate);
                    return res.status(400).send({ message: 'License plate already exists' });
                }

                console.error('Error inserting vehicle into database:', err);
                return res.status(500).send({ message: 'Error inserting vehicle into database', error: err });
            }

            // Get the vehicle_id from the insert result
            const vehicle_id = resultInsert.insertId;
            console.log('Vehicle registered successfully with vehicle_id:', vehicle_id);

            // Send vehicle_id to frontend
            res.status(200).send({ message: 'Vehicle registration request submitted successfully', vehicle_id });
        });
    });
});

// Fetch Vehicle Types Endpoint
router.get('/vehicleTypes', (req, res) => {
    const query = 'SELECT vehicle_type_id, type_name, capacity FROM VehicleTypes';

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching vehicle types:', err);
            return res.status(500).send({ message: 'Internal Server Error' });
        }

        res.status(200).send(results);
    });
});


router.post('/check-approval', (req, res) => {
    const { driver_id } = req.body;

    if (!driver_id) {
        return res.status(400).json({ message: 'Driver ID is required' });
    }

    const query = 'SELECT registration_status FROM Drivers WHERE driver_id = ?';
    db.query(query, [driver_id], (err, result) => {
        if (err) {
            console.error('Error fetching driver approval status:', err);
            return res.status(500).json({ message: 'Server error' });
        }
        if (result.length > 0) {
            console.log(result);
            return res.status(200).json({ registration_status: result[0].registration_status });
        } else {
            return res.status(404).json({ message: 'Driver not found' });
        }
    });
});
router.post('/registerBusRoute', (req, res) => {
    const { route_name, origin_city, destination_city, distance, duration, stops, vehicle_id } = req.body;

    // Validate the input data
    if (!route_name || !origin_city || !destination_city || !distance || !duration || !Array.isArray(stops) || stops.length === 0 || !vehicle_id) {
        return res.status(400).json({ message: 'All fields are required, and stops must be a non-empty array. Vehicle ID is also required.' });
    }

    // Insert the new route into the routes table
    const routeQuery = 'INSERT INTO routes (route_name, distance, duration, stops, origin_city, destination_city) VALUES (?, ?, ?, ?, ?, ?)';
    const routeValues = [route_name, distance, duration, stops.join(','), origin_city, destination_city];
    db.query(routeQuery, routeValues, (err, routeResult) => {
        if (err) {
            console.error('Error inserting route:', err);
            return res.status(500).json({ message: 'Error registering bus route' });
        }

        // Get the route_id of the inserted record
        const route_id = routeResult.insertId;

        // Proceed with inserting stops into the RouteStops table and Busschedules table
        stops.forEach((stop, index) => {
            const stopName = stop.trim();
            const stopQuery = 'SELECT area_id FROM Areas WHERE area_name = ?';
            db.query(stopQuery, [stopName], (err, areaResult) => {
                if (err) {
                    console.error(`Error fetching area for stop "${stopName}":`, err);
                    return;
                }

                if (areaResult.length > 0) {
                    const stopId = areaResult[0].area_id;

                    // Insert into RouteStops table
                    const stopInsertQuery = 'INSERT INTO RouteStops (route_id, stop_id, stop_order) VALUES (?, ?, ?)';
                    db.query(stopInsertQuery, [route_id, stopId, index + 1], (err) => {
                        if (err) {
                            console.error(`Error inserting stop "${stopName}" into RouteStops:`, err);
                        }
                    });

                    // Insert into Busschedules table
                    const busScheduleQuery = 'INSERT INTO busschedules (route_id, stop_id, vehicle_id, stop_order) VALUES (?, ?, ?, ?)';
                    db.query(busScheduleQuery, [route_id, stopId, vehicle_id, index + 1], (err) => {
                        if (err) {
                            console.error(`Error inserting stop "${stopName}" into Busschedules:`, err);
                        }
                    });
                } else {
                    console.warn(`Stop "${stopName}" not found in Areas table. Skipping.`);
                }
            });
        });

        // Return success response after all operations
        res.status(200).json({ message: 'Bus route registered successfully!' });
    });
});



// Endpoint to fetch all vehicles for a driver
router.get('/vehicles/:driverId', (req, res) => {
    const driverId = req.params.driverId;

    const sqlQuery = `
        SELECT 
            v.vehicle_id,
            v.license_plate,
            v.status,
            v.gps_latitude,
            v.gps_longitude,
            v.remaining_capacity,
            v.city,
            vt.type_name,
            vt.capacity
        FROM 
            Vehicles v
        INNER JOIN 
            VehicleTypes vt ON v.vehicle_type_id = vt.vehicle_type_id
        WHERE 
            v.driver_id = ? AND v.status = 'Available'`;

    db.query(sqlQuery, [driverId], (err, results) => {
        if (err) {
            console.error("[ERROR] Failed to fetch vehicles:", err);
            return res.status(500).json({ error: 'Failed to fetch vehicles' });
        }

        res.json(results); // Send vehicle details as JSON
    });
});
router.get('/can-register/:driverId', async (req, res) => {
    try {
        const { driverId } = req.params;

        // Correct SQL query (removed unnecessary single quotes)
        const sqlQuery = `SELECT COUNT(*) AS vehicleCount FROM Vehicles WHERE driver_id = ? AND v.status = 'Available'`;

        // Execute the query using callback
        db.query(sqlQuery, [driverId], (err, results) => {
            if (err) {
                console.error("[ERROR] Failed to fetch vehicles:", err);
                return res.status(500).json({ error: 'Failed to fetch vehicles' });
            }

            // Extract the vehicleCount from the result
            const vehicleCount = results[0]?.vehicleCount || 0;

            // If vehicleCount > 0, the driver cannot register more vehicles
            if (vehicleCount > 0) {
                return res.status(200).json({ canRegister: false });
            }

            // Otherwise, the driver can register more vehicles
            res.status(200).json({ canRegister: true });
        });

    } catch (error) {
        console.error('Error checking registration status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


module.exports = router;

