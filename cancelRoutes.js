const express = require('express');
const db = require('./db');  // Ensure this points to your MySQL connection setup

const router = express.Router();



router.post('/api/cancel-ride/:rideId', (req, res) => {
    const rideId = req.params.rideId;

    console.log('Received cancel request:', { rideId });

    // Step 1: Start the transaction
    db.beginTransaction(err => {
        if (err) {
            console.error('Transaction error:', err);
            return res.status(500).json({ error: 'Transaction Error' });
        }

        console.log('Transaction started successfully');

        // Step 2: Get passenger_id and vehicle_id from the Rides table
        const rideQuery = `
            SELECT passenger_id, vehicle_id 
            FROM rides 
            WHERE ride_id = ?
        `;

        db.query(rideQuery, [rideId], (err, result) => {
            if (err) {
                console.error('Error fetching passenger and vehicle info:', err);
                db.rollback(() => res.status(500).json({ error: 'Error fetching ride details' }));
                return;
            }

            if (result.length === 0) {
                console.error('No ride found for the given rideId');
                db.rollback(() => res.status(404).json({ error: 'Ride not found' }));
                return;
            }

            const { passenger_id: passengerId, vehicle_id: vehicleId } = result[0];
            console.log('Fetched ride details:', { passengerId, vehicleId });

            // Step 3: Log the cancellation
            const cancellationQuery = `
                INSERT INTO ride_cancellations (ride_id, canceled_by, passenger_id, vehicle_id)
                VALUES (?, 'user', ?, ?)
            `;

            db.query(cancellationQuery, [rideId, passengerId, vehicleId], (err) => {
                if (err) {
                    console.error('Error logging cancellation:', err);
                    db.rollback(() => res.status(500).json({ error: 'Error logging cancellation' }));
                    return;
                }

                console.log('Cancellation logged successfully for ride:', rideId);

                // Step 4: Update the ride status to 'cancelled'
                const updateRideQuery = 'UPDATE rides SET status = ? WHERE ride_id = ? AND passenger_id = ?';

                db.query(updateRideQuery, ['cancelled', rideId, passengerId], (err, result) => {
                    if (err) {
                        console.error('Error updating ride status:', err);
                        db.rollback(() => res.status(500).json({ error: 'Error updating ride status' }));
                        return;
                    }

                    if (result.affectedRows === 0) {
                        console.error('No ride found for the given rideId and passengerId');
                        db.rollback(() => res.status(404).json({ error: 'No ride found for the specified user' }));
                        return;
                    }

                    console.log('Ride status updated to cancelled:', { rideId, passengerId });

                    // Step 5: Commit the transaction
                    db.commit(err => {
                        if (err) {
                            console.error('Error committing transaction:', err);
                            db.rollback(() => res.status(500).json({ error: 'Commit Failed' }));
                            return;
                        }

                        console.log('Transaction committed successfully');
                        res.json({ message: 'Ride cancelled successfully' });
                    });
                });
            });
        });
    });
});



module.exports = router;
