const express = require('express');
const db = require('./db');
const router = express.Router();

router.post('/api/book-ride', (req, res) => {
    const {
        passenger_id,
        vehicle_id,
        pickup_latitude,
        pickup_longitude,
        dropoff_latitude,
        dropoff_longitude,
        ride_type,
        booking_time,
        fare,
        scheduled_time,
        seats,
        paymentMethod,
    } = req.body;

    console.log('Received data for booking ride:', req.body);

    if (!passenger_id || !vehicle_id || !pickup_latitude || !pickup_longitude || !dropoff_latitude || !dropoff_longitude || !ride_type || !booking_time || !fare || !scheduled_time || !seats || !paymentMethod) {
        console.log('Missing required fields:', { passenger_id, vehicle_id, pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude, ride_type, booking_time, fare, scheduled_time, seats, paymentMethod });
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const insertPassengerQuery = 'INSERT INTO Passengers (user_id, preferred_payment_method) VALUES (?, ?)';
    console.log(`Executing query: ${insertPassengerQuery}`);
    db.query(insertPassengerQuery, [passenger_id, paymentMethod], (err, insertResult) => {
        if (err) {
            console.error('Error inserting passenger:', err.message);
            return res.status(500).json({ message: 'Error inserting passenger.', error: err.message });
        }

        const confirmedPassengerId = insertResult.insertId;
        console.log('Inserted passenger with ID:', confirmedPassengerId);

        const insertRideQuery = `
            INSERT INTO Rides (passenger_id, vehicle_id, pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude, ride_type, booking_time, fare, scheduled_time, seats)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        console.log(`Executing query: ${insertRideQuery}`);
        db.query(insertRideQuery, [confirmedPassengerId, vehicle_id, pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude, ride_type, booking_time, fare, scheduled_time, seats], (err, result) => {
            if (err) {
                console.error('Error booking the ride:', err.message);
                return res.status(500).json({ message: 'Error booking the ride.', error: err.message });
            }
            const rideId = result.insertId;
            console.log('Ride booked successfully with ID:', rideId);

            const updateVehicleQuery = 'UPDATE Vehicles SET status = ? WHERE vehicle_id = ?';
            console.log(`Executing query: ${updateVehicleQuery}`);
            db.query(updateVehicleQuery, ['OnRide', vehicle_id], (err, result) => {
                if (err) {
                    console.error('Error updating vehicle status:', err.message);
                    return res.status(500).json({ message: 'Error updating vehicle status.', error: err.message });
                }
                console.log('Vehicle status updated to OnRide' , rideId , confirmedPassengerId);
                return res.json({ message: 'Ride booked successfully', rideId, passengerId: confirmedPassengerId });
            });
        });
    });
});

router.post('/api/get-book-ride', (req, res) => {
    const { passenger_id, vehicle_id, pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude, ride_type, booking_time, fare, scheduled_time, seats  , paymentMethod} = req.body;

    // Log incoming request data
    console.log('Received data for getting booked ride:', req.body);

    // Check for missing fields and log if any are missing
    if (!passenger_id || !vehicle_id || !pickup_latitude || !pickup_longitude || !dropoff_latitude || !dropoff_longitude || !ride_type || !booking_time || !fare || !scheduled_time || !seats || !paymentMethod) {
        console.log('Missing required fields:', { passenger_id, vehicle_id, pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude, ride_type, booking_time, fare, scheduled_time, seats , paymentMethod });
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const insertPassengerQuery = 'INSERT INTO Passengers (user_id, preferred_payment_method) VALUES (?, ?)';
    console.log(`Executing query: ${insertPassengerQuery}`);
    db.query(insertPassengerQuery, [passenger_id, paymentMethod], (err, insertResult) => {
        if (err) {
            console.error('Error inserting passenger:', err.message);
            return res.status(500).json({ message: 'Error inserting passenger.', error: err.message });
        }

        const confirmedPassengerId = insertResult.insertId;
        console.log('Inserted passenger with ID:', confirmedPassengerId);

        const insertRideQuery = `
            INSERT INTO Rides (passenger_id, vehicle_id, pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude, ride_type, booking_time, fare , scheduled_time , seats)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        console.log(`Executing query: ${insertRideQuery}`);
        db.query(insertRideQuery, [confirmedPassengerId, vehicle_id, pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude, ride_type, booking_time, fare, scheduled_time, seats], (err, result) => {
            if (err) {
                console.error('Error booking the ride:', err.message);
                return res.status(500).json({ message: 'Error booking the ride.', error: err.message });
            }
            const rideId = result.insertId;
            console.log('Ride booked successfully with ID:', rideId);

            const updateVehicleQuery = 'UPDATE Vehicles SET status = ? WHERE vehicle_id = ?';
            console.log(`Executing query: ${updateVehicleQuery}`);
            db.query(updateVehicleQuery, ['OnRide', vehicle_id], (err, result) => {
                if (err) {
                    console.error('Error updating vehicle status:', err.message);
                    return res.status(500).json({ message: 'Error updating vehicle status.', error: err.message });
                }
                console.log('Vehicle status updated to OnRide');
                return res.json({ message: 'Ride booked successfully', rideId });
            });
        });
    });
});



router.post('/api/update-capacity', (req, res) => {
    const { vehicle_id, remaining_capacity } = req.body;

    console.log('Request received for updating capacity:', { vehicle_id, remaining_capacity });

    // Check for missing parameters
    if (vehicle_id === undefined || remaining_capacity === undefined) {
        console.error('Missing required parameters:', { vehicle_id, remaining_capacity });
        return res.status(400).json({
            error: 'Missing required parameters. Please provide vehicle_id and remaining_capacity.',
        });
    }

    const updateSql = `
        UPDATE vehicles
        SET remaining_capacity = ?
        WHERE vehicle_id = ?;
    `;

    console.log('Executing SQL query to update remaining capacity...');
    db.query(updateSql, [remaining_capacity, vehicle_id], (err, result) => {
        if (err) {
            console.error('Database error while updating remaining capacity:', err);
            return res.status(500).json({ error: 'Failed to update remaining capacity' });
        }

        console.log('SQL query executed successfully. Result:', result);

        if (result.affectedRows === 0) {
            console.warn(`No vehicle found with ID: ${vehicle_id}`);
            return res.status(404).json({ error: 'Vehicle not found.' });
        }

        console.log(`Capacity updated successfully for vehicle ID: ${vehicle_id}, Remaining Capacity: ${remaining_capacity}`);
        res.json({ message: 'Vehicle capacity updated successfully.' });
    });
});




router.post('/api/bus-book-ride', (req, res) => {
    const {
        passenger_id,
        vehicle_id,
        pickup_latitude,
        pickup_longitude,
        dropoff_latitude,
        dropoff_longitude,
        ride_type,
        booking_time,
        fare,
        scheduled_time,
        seats,
        paymentMethod,
    } = req.body;

    console.log('Received data for booking ride:', req.body);

    if (!passenger_id || !vehicle_id || !pickup_latitude || !pickup_longitude || !dropoff_latitude || !dropoff_longitude || !ride_type || !booking_time || !fare || !scheduled_time || !seats || !paymentMethod) {
        console.log('Missing required fields:', { passenger_id, vehicle_id, pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude, ride_type, booking_time, fare, scheduled_time, seats, paymentMethod });
        return res.status(400).json({ message: 'Missing required fields' });
    }
    const insertPassengerQuery = 'INSERT INTO Passengers (user_id, preferred_payment_method) VALUES (?, ?)';
    console.log(`Executing query: ${insertPassengerQuery}`);
    db.query(insertPassengerQuery, [passenger_id, paymentMethod], (err, insertResult) => {
        if (err) {
            console.error('Error inserting passenger:', err.message);
            return res.status(500).json({ message: 'Error inserting passenger.', error: err.message });
        }

        const confirmedPassengerId = insertResult.insertId;
        console.log('Inserted passenger with ID:', confirmedPassengerId);

        const insertRideQuery = `
            INSERT INTO Rides (passenger_id, vehicle_id, pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude, ride_type, booking_time, fare, scheduled_time, seats)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        console.log(`Executing query: ${insertRideQuery}`);
        db.query(insertRideQuery, [confirmedPassengerId, vehicle_id, pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude, ride_type, booking_time, fare, scheduled_time, seats], (err, result) => {
            if (err) {
                console.error('Error booking the ride:', err.message);
                return res.status(500).json({ message: 'Error booking the ride.', error: err.message });
            }
            const rideId = result.insertId;
            console.log('Vehicle status updated to OnRide' , rideId , confirmedPassengerId);
                return res.json({ message: 'Ride booked successfully', rideId, passengerId: confirmedPassengerId });
        });
        
    });
});


module.exports = router;
