const express = require('express');
const db = require('./db');
const router = express.Router();

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
}
function calculateFare(vehicleType, distance, baseFare, perKmRate, peakTimeMultiplier = 1) {
  
    if (isNaN(baseFare) || isNaN(perKmRate) || isNaN(distance) || isNaN(peakTimeMultiplier)) {
        console.error('Invalid input to fare calculation');
        return NaN;
    }
    const distanceFare = perKmRate * distance;
    const fare = parseFloat(baseFare) + parseFloat(distanceFare);
    const roundedFare = Math.round(fare);
    return roundedFare;
}

router.get('/api/vehicles', async (req, res) => {
    const startLocation = req.query.start;
    const endLocation = req.query.end;
    const selectedVehicleType = req.query.type;   
    if (!startLocation || !endLocation || !selectedVehicleType) {
        return res.status(400).json({ error: 'Invalid parameters. Please provide valid start, end, and type.' });
    }
    const [startLat, startLng] = startLocation.split(',').map(Number);
    let endLat, endLng;
    if (endLocation.includes(',')) {
        [endLat, endLng] = endLocation.split(',').map(Number);
    } else {
        try {
            [endLat, endLng] = await geocodeLocation(endLocation);
        } catch (error) {
            return res.status(400).json({ error: 'Invalid end location. Please provide a valid address.' });
        }
    }
    if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
        return res.status(400).json({ error: 'Invalid start or end location coordinates.' });
    }
    const distance = calculateDistance(startLat, startLng, endLat, endLng);
    const minLat = Math.min(startLat, endLat) - 0.01;
    const maxLat = Math.max(startLat, endLat) + 0.01;
    const minLng = Math.min(startLng, endLng) - 0.01;
    const maxLng = Math.max(startLng, endLng) + 0.01;
    const query = `
        SELECT v.vehicle_id, v.license_plate, v.remaining_capacity, vt.type_name, v.gps_latitude, v.gps_longitude, f.base_fare, f.per_km_rate,v.driver_id ,  f.min_fare, f.peak_time_multiplier
        FROM vehicles v
        JOIN vehicletypes vt ON v.vehicle_type_id = vt.vehicle_type_id
        JOIN fare f ON vt.vehicle_type_id = f.vehicle_type_id
        WHERE vt.type_name = ? 
        AND v.gps_latitude BETWEEN ? AND ? 
        AND v.gps_longitude BETWEEN ? AND ? 
        AND v.status = "Available";
    `;
    
    db.query(query, [selectedVehicleType, minLat, maxLat, minLng, maxLng], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database query error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'No vehicles found in the selected locations.' });
        }
        const vehiclesWithFareAndDistance = results.map(vehicle => {
            const vehicleDistance = calculateDistance(startLat, startLng, vehicle.gps_latitude, vehicle.gps_longitude);
            const fare = calculateFare(
                vehicle.type_name,
                vehicleDistance,
                vehicle.base_fare,
                vehicle.per_km_rate,
                vehicle.peak_time_multiplier || 1
            );
            return {
                ...vehicle,
                distance: vehicleDistance.toFixed(2),
                fare: fare.toFixed(2)
            };
        });
        res.json(vehiclesWithFareAndDistance);
    });
});

async function geocodeLocation(location) {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`);
    const data = await response.json();
    if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        return [lat, lng];
    }
    throw new Error('Unable to geocode location');
}
module.exports = {
    calculateDistance,
    calculateFare,
    router
};
