const express = require('express');
const db = require('./db');
const router = express.Router();

function calculateFare(vehicleType, distance, baseFare, perKmRate, peakTimeMultiplier = 1) {
    console.log(`Calculating fare for:`, { vehicleType, distance, baseFare, perKmRate, peakTimeMultiplier });

    if (isNaN(baseFare) || isNaN(perKmRate) || isNaN(distance)) {
        console.error('Invalid input to fare calculation:', { baseFare, perKmRate, distance });
        return NaN;
    }
    const distanceFare = perKmRate * distance;
    console.log(`Distance fare: ${distanceFare}`);

    const fare = parseFloat(baseFare) + parseFloat(distanceFare) * peakTimeMultiplier;
    console.log(`Total fare calculated: ${fare}`);

    if (isNaN(fare)) {
        console.error('Calculated fare is NaN');
        return NaN;
    }
    return fare;
}

// Function to calculate the distance between two GPS coordinates using the Haversine formula
function calculateDistance(lat1, lng1, lat2, lng2) {
    console.log(`Calculating distance between:`, { lat1, lng1, lat2, lng2 });

    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km

    console.log(`Calculated distance: ${distance} km`);
    return distance;
}

router.get('/api/get-all-buses', async (req, res) => {
    const userLat = parseFloat(req.query.lat);
    const userLng = parseFloat(req.query.lng);

    console.log(`User location received:`, { userLat, userLng });

    if (isNaN(userLat) || isNaN(userLng)) {
        console.error('Invalid location parameters:', { userLat, userLng });
        return res.status(400).json({ error: 'Invalid location parameters. Please provide valid latitude and longitude.' });
    }

    const query = `
        SELECT v.vehicle_id, v.license_plate, vt.type_name, v.gps_latitude, v.gps_longitude, v.driver_id,
               f.base_fare, f.per_km_rate, f.min_fare, f.peak_time_multiplier, v.remaining_capacity
        FROM vehicles v
        JOIN vehicletypes vt ON v.vehicle_type_id = vt.vehicle_type_id
        JOIN fare f ON vt.vehicle_type_id = f.vehicle_type_id
        WHERE vt.type_name = "Bus" AND v.status = "Available";
    `;

    console.log('Executing database query for available buses...');
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ error: 'Database query error' });
        }

        console.log(`Buses found in database: ${results.length}`);
        if (results.length === 0) {
            console.log('No buses found in the database.');
            return res.status(404).json({ message: 'No buses found in the database.' });
        }

        console.log('Filtering buses within a 7 km radius...');
        const nearbyBuses = results.filter(vehicle => {
            const busDistance = calculateDistance(userLat, userLng, vehicle.gps_latitude, vehicle.gps_longitude);
            console.log(`Bus ID: ${vehicle.vehicle_id}, Distance: ${busDistance} km`);
            return busDistance <= 7;
        });

        console.log(`Nearby buses found: ${nearbyBuses.length}`);
        if (nearbyBuses.length === 0) {
            console.log('No buses found within a 7 km radius.');
            return res.status(404).json({ message: 'No buses found within a 7 km radius of your location.' });
        }

        console.log('Calculating fare and distance for nearby buses...');
        const busesWithFareAndDistance = nearbyBuses.map(vehicle => {
            const busDistance = calculateDistance(userLat, userLng, vehicle.gps_latitude, vehicle.gps_longitude);

            if (vehicle.peak_time_multiplier === null || vehicle.peak_time_multiplier === undefined) {
                console.warn(`Bus ID: ${vehicle.vehicle_id} has no peak time multiplier. Defaulting to 1.`);
                vehicle.peak_time_multiplier = 1;
            }

            const fare = calculateFare(
                vehicle.type_name,
                busDistance,
                vehicle.base_fare,
                vehicle.per_km_rate,
                vehicle.peak_time_multiplier
            );

            console.log(`Bus ID: ${vehicle.vehicle_id}, Calculated Fare: ${fare}, Distance: ${busDistance.toFixed(2)} km`);
            return {
                ...vehicle,
                fare: !isNaN(fare) ? fare.toFixed(2) : 'N/A',
                distance: busDistance.toFixed(2)
            };
        });

        console.log('Final list of buses with fare and distance:', busesWithFareAndDistance);
        res.json(busesWithFareAndDistance);
    });
});

router.get('/api/get-bus-stops', (req, res) => {
    const vehicleId = req.query.vehicle_id;

    console.log(`Request to get bus stops for vehicle ID: ${vehicleId}`);

    if (!vehicleId) {
        console.error('Vehicle ID is required.');
        return res.status(400).json({ message: 'Vehicle ID is required.' });
    }

    const query = `
        SELECT 
            rs.stop_id, 
            rs.stop_order, 
            bs.stop_id AS schedule_stop_id, 
            r.route_name, 
            r.distance, 
            r.duration, 
            a.latitude AS lat, 
            a.longitude AS lng, 
            a.area_name
        FROM RouteStops rs
        INNER JOIN BusSchedules bs ON rs.stop_id = bs.stop_id AND rs.route_id = bs.route_id
        INNER JOIN Routes r ON rs.route_id = r.route_id
        INNER JOIN Areas a ON rs.stop_id = a.area_id
        WHERE bs.vehicle_id = ?
        ORDER BY rs.stop_order;
    `;

    db.query(query, [vehicleId], (err, results) => {
        if (err) {
            console.error('Failed to retrieve bus stops:', err);
            return res.status(500).json({ message: 'Failed to retrieve bus stops.' });
        }

        console.log(`Number of stops retrieved: ${results.length}`);

        if (results.length === 0) {
            console.log('No stops found for this bus.');
            return res.status(404).json({ message: 'No stops found for this bus.' });
        }

        res.json(results);
    });
});

module.exports = {
    calculateDistance,
    calculateFare,
    router
};
