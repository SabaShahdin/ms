const express = require('express');
const db = require('./db');
const router = express.Router();
router.get('/all-vehicles', (req, res) => {
  const { type, status, area } = req.query;
  // Validate query parameters
  if (!area || !type || !status || area === 'none' || type === 'none' || status === 'none') {
    return res.status(400).json({
      error: 'Invalid parameters. Please provide valid area, type, and status.'
    });
  }
  const areaQuery = 'SELECT area_name, latitude, longitude FROM Areas WHERE area_name = ?';
  db.query(areaQuery, [area], (err, areaResults) => {
    if (err) {
      return res.status(500).json({ error: 'Database query error while fetching area data' });
    }
    if (!areaResults.length) {
      return res.status(404).json({ error: 'Area not found' });
    }
    const { latitude: areaLat, longitude: areaLon } = areaResults[0];
    const query = `
   SELECT v.vehicle_id, v.license_plate, vt.type_name, v.gps_latitude, v.gps_longitude, v.status
FROM Vehicles v
JOIN VehicleTypes vt ON v.vehicle_type_id = vt.vehicle_type_id
LEFT JOIN Areas a ON 1 = 1  -- No direct relationship, just including Area filter
WHERE 1 = 1
  AND (vt.type_name = ? OR ? = 'All')                  
  AND (v.status = ? OR ? = 'All')                      
  AND (a.area_name = ? OR ? = 'All')                   
  AND (
    6371 * ACOS(
      COS(RADIANS(?)) * COS(RADIANS(v.gps_latitude)) * 
      COS(RADIANS(v.gps_longitude) - RADIANS(?)) + 
      SIN(RADIANS(?)) * SIN(RADIANS(v.gps_latitude))
    ) 
  ) <= 5                                                
LIMIT 0, 100;                                            
    `;
    db.query(query, [type, type, status, status, area, area, areaLat, areaLon, areaLat], (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database query error while fetching vehicles' });
      }
      res.json(results);
    });
  });
});

router.post('/api/update-ride', (req, res) => {
  const { rideId } = req.body;
  if (!rideId) {
    return res.status(400).json({ error: 'Missing required parameters. Please provide rideId.' });
  }
  const updateSql = `
    UPDATE rides
    SET status = 'On Ride'  
    WHERE ride_id = ?;
  `;
  db.query(updateSql, [rideId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to update vehicle status to on ride.' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }
    res.json({ message: 'Successfully updated vehicle location for rideId:', rideId });
  });
});

router.post('/api/update-vehicle-status', (req, res) => {
  const { licensePlate, rideId } = req.body;

  if (!licensePlate || !rideId) {
    return res.status(400).json({ error: 'Please provide both licensePlate and rideId.' });
  }

  // Step 1: Query to get the remaining capacity using licensePlate
  const getCapacitySql = `
    SELECT v.remaining_capacity, r.seats 
    FROM vehicles v
    JOIN rides r ON v.vehicle_id = r.vehicle_id
    WHERE v.license_plate = ? AND r.ride_id = ? ;
  `;
  db.query(getCapacitySql, [licensePlate, rideId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch remaining capacity.' });
    }
    if (result.length === 0) {
      return res.status(404).json({ error: 'Vehicle or Ride not found with the provided license plate and rideId.' });
    }
    const remainingCapacity = result[0].remaining_capacity;
    const seats = result[0].seats;
    const updateVehicleSql = `
      UPDATE vehicles v
      JOIN rides r ON v.vehicle_id = r.vehicle_id
      SET v.status = 'Available', 
          v.remaining_capacity = v.remaining_capacity + r.seats
      WHERE v.license_plate = ? AND r.ride_id = ?;
    `;
    db.query(updateVehicleSql, [licensePlate, rideId], (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to update vehicle status.' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Ride not found or status update failed.' });
      }
      res.json({ message: 'Vehicle status updated successfully with remaining capacity.' });
    });
  });
});
router.post('/api/update-complete', (req, res) => {
  const { rideId } = req.body;
  if (!rideId) {
    return res.status(400).json({ error: 'Missing required parameters. Please provide rideId.' });
  }
  const updateSql = `
    UPDATE rides
    SET status = 'Completed'  
    WHERE ride_id = ?;
  `;
  db.query(updateSql, [rideId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to upate status to complete' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'No ride is completed' });
    }
    res.json({ message: 'Ride is completed' });
  });
});


router.post('/api/update-vehicle', (req, res) => {
  const { licensePlate, rideId } = req.body;
  if (!licensePlate || !rideId) {
    return res.status(400).json({ error: 'Please provide both licensePlate and rideId.' });
  }
  const getCapacitySql = `
    SELECT v.remaining_capacity, r.seats 
    FROM vehicles v
    JOIN rides r ON v.vehicle_id = r.vehicle_id
    WHERE v.license_plate = ? AND r.ride_id = ?;
  `;

  db.query(getCapacitySql, [licensePlate, rideId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch remaining capacity.' });
    }
    if (result.length === 0) {
      return res.status(404).json({ error: 'Vehicle or Ride not found with the provided license plate and rideId.' });
    }
    const remainingCapacity = result[0].remaining_capacity;
    const seats = result[0].seats;
    const updateVehicleSql = `
      UPDATE vehicles v
      JOIN rides r ON v.vehicle_id = r.vehicle_id
      SET v.remaining_capacity = v.remaining_capacity + r.seats
      WHERE v.license_plate = ? AND r.ride_id = ?;
    `;
    db.query(updateVehicleSql, [licensePlate, rideId], (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to update vehicle remaining capcity ' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Ride not found or status update failed.' });
      }

      // Send success message
      res.json({ message: 'Vehicle status updated successfully with remaining capacity.' });
    });
  });
});
router.post('/api/update-bus-seats', (req, res) => {
  const { licensePlate } = req.body;
  if (!licensePlate) {
    return res.status(400).json({ error: 'Please provide the licensePlate.' });
  }
  const getTotalSeatsSql = `
    SELECT v.vehicle_id, v.remaining_capacity, SUM(r.seats) AS total_seats
    FROM vehicles v
    JOIN rides r ON v.vehicle_id = r.vehicle_id
    WHERE v.license_plate = ?
    GROUP BY v.vehicle_id, v.remaining_capacity;
  `;
  db.query(getTotalSeatsSql, [licensePlate], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch vehicle data.' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'No vehicles or rides found with the provided license plate.' });
    }
    const row = results[0];
    const updatedCapacity = parseFloat(row.remaining_capacity) + parseFloat(row.total_seats);
    const updateVehicleSql = `
      UPDATE vehicles
      SET remaining_capacity = ?
      WHERE vehicle_id = ?;
    `;

    db.query(updateVehicleSql, [updatedCapacity, row.vehicle_id], (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to update vehicle remaining capacity.' });
      }
      const updateRidesSql = `
        UPDATE rides r
        JOIN vehicles v ON r.vehicle_id = v.vehicle_id
        SET r.status = 'Completed'  , v.status = 'Available'
        WHERE v.license_plate = ?;
      `;
      db.query(updateRidesSql, [licensePlate], (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to update ride statuses.' });
        }
        res.json({ message: 'All vehicle capacities and ride statuses updated successfully.' });
      });
    });
  });
});

router.post('/api/update-ride-status', (req, res) => {
  const { licensePlate } = req.body;
  if (!licensePlate) {
    return res.status(400).json({ error: 'Please provide the licensePlate.' });
  }
  const updateRidesSql = `
    UPDATE rides r
    JOIN vehicles v ON r.vehicle_id = v.vehicle_id
    SET r.status = 'Completed', v.status = 'Available'
    WHERE v.license_plate = ?;
  `;
  db.query(updateRidesSql, [licensePlate], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to update ride statuses.' });
    }
    res.json({ message: 'Ride statuses updated successfully.' });
  });
});
router.post('/api/update-buss', (req, res) => {
  const { license_plate, rideId } = req.body;
  if (!license_plate || !rideId) {
    return res.status(400).json({ error: 'Please provide both license_plate and rideId.' });
  }
  const getCapacitySql = `
    SELECT v.remaining_capacity, r.seats 
    FROM vehicles v
    JOIN rides r ON v.vehicle_id = r.vehicle_id
    WHERE v.license_plate = ? AND r.ride_id = ?;
  `;
  db.query(getCapacitySql, [license_plate, rideId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch remaining capacity.' });
    }
    if (result.length === 0) {
      return res.status(404).json({ error: 'Vehicle or Ride not found with the provided license plate and rideId.' });
    }
    const remainingCapacity = result[0].remaining_capacity;
    const seats = result[0].seats;
    const updateVehicleSql = `
      UPDATE vehicles v
      JOIN rides r ON v.vehicle_id = r.vehicle_id
      SET v.remaining_capacity = v.remaining_capacity + r.seats
      WHERE v.license_plate = ? AND r.ride_id = ?;
    `;

    db.query(updateVehicleSql, [license_plate, rideId], (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to update vehicle remaing capacity' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Ride not found or  capaity update failed.' });
      }
      // Send success message
      res.json({ message: 'Vehicle status updated successfully with remaining capacity.' });
    });
  });
});


// Endpoint to delete (mark as inactive) a vehicle
router.post('/delete-vehicle/:vehicleId', (req, res) => {
  const { vehicleId } = req.params;

  // Query to update the vehicle status to 'Inactive'
  const query = `UPDATE Vehicles SET status = 'Inactive' WHERE vehicle_id = ?`;

  db.query(query, [vehicleId], (error, result) => {
      if (error) {
          console.error('Error updating vehicle status:', error);
          return res.status(500).json({ error: 'Database error while deleting vehicle.' });
      }

      if (result.affectedRows > 0) {
          res.json({ message: 'Vehicle marked as inactive successfully.' });
      } else {
          res.status(404).json({ error: 'Vehicle not found.' });
      }
  });
});



module.exports = router;
