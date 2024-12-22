const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const db = require('./db'); // Ensure the database connection works properly

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    'https://fluffy-zabaione-e51cd0.netlify.app'
  ],
  credentials: true,
}));

// Routes
const authRoutes = require('./authRoutes');
const vehicleRoutes = require('./vehicleRoutes');
const areaRoutes = require('./areaRoutes');
const { router: rideRoutes } = require('./rideRoutes');
const bookRoutes = require('./bookRide');
const { router: busRoutes } = require('./busRide');
const cityRoute = require('./cityRoutes');
const cancelRoute = require('./cancelRoutes');
const paymentRoutes = require('./paymentRoutes');
const driverRoute = require('./driverRoutes');
const statRoutes = require('./stats');

app.use('/auth', authRoutes);
app.use('/real', vehicleRoutes);
app.use('/get-area', areaRoutes);
app.use('/ride', rideRoutes);
app.use('/book', bookRoutes);
app.use('/bus', busRoutes);
app.use('/city', cityRoute);
app.use('/cancel', cancelRoute);
app.use('/payment', paymentRoutes);
app.use('/driver', driverRoute);
app.use('/stats', statRoutes);
// WebSocket Server
const wss = new WebSocket.Server({ port: 8080 });


function broadcastVehicleData() {
  const query = `
    SELECT v.vehicle_id, v.license_plate, vt.type_name, v.gps_latitude, v.gps_longitude, v.status
    FROM vehicles v
    JOIN vehicletypes vt ON v.vehicle_type_id = vt.vehicle_type_id
  `;
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database query error:', err });
    }
    const data = JSON.stringify(results);
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });
}
app.post('/api/update-vehicle-location', (req, res) => {
    const { license_plate, latitude, longitude } = req.body;
    if (!license_plate || !latitude || !longitude) {
      return res.status(400).json({ error: 'Missing required parameters. Please provide license_plate, latitude, and longitude.' });
    }
    const updateSql = `
      UPDATE vehicles
      SET gps_latitude = ?, gps_longitude = ?
      WHERE license_plate = ?;
    `;
    db.query(updateSql, [latitude, longitude, license_plate], (err, result) => {
      if (err) {
       
        return res.status(500).json({ error: 'Failed to update vehicle location.' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Vehicle not found.' });
      }
      res.json({ message: 'Vehicle location updated successfully.' });
      broadcastVehicleData(); 
    });
  });
  
// Handle Contact Us Form Submission
app.post('/submit-contact', (req, res) => {
  const { name, email, phone, message } = req.body;
  const sql = 'INSERT INTO contact_us_submissions (name, email, phone, message) VALUES (?, ?, ?, ?)';
  db.query(sql, [name, email, phone, message], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error, please try again later.' });
    }
    res.status(200).json({ message: 'Thank you for contacting us! We will get back to you soon.' });
  });
});

const clients = {
  passengers: {}, // Map of passengerId -> WebSocket connection
  drivers: {},    // Map of driverId -> WebSocket connection
};

// WebSocket Connection Handling
wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received data:', data);

      if (data.type === 'passenger') {
        // Store passenger WebSocket connection
        clients.passengers[data.passengerId] = ws;

        // Broadcast ride request to all available drivers (only for ride request)
        Object.values(clients.drivers).forEach((driverWs) => {
          driverWs.send(JSON.stringify({
            type: 'rideRequest',
            data: data.data,  // send the ride data to drivers
          }));
        });

      } else if (data.type === 'driver') {
        ws.driverId = data.driverId; // Store driverId on the WebSocket object
        // Store driver WebSocket connection
        clients.drivers[data.driverId] = ws;

      } else if (data.type === 'driver' && data.action === 'acceptRide') {
        // Handle the driver accepting the ride
        const passengerWs = clients.passengers[data.data.passengerId];
        if (passengerWs) {
          passengerWs.send(JSON.stringify({
            type: 'rideConfirmation',
            data: {
              status: 'Accepted',
              driverId: data.driverId,
              pickup: data.data.pickup,
              destination: data.data.destination,
            },
          }));
        }
      } else if (data.type === 'driver' && data.action === 'rejectRide') {
        // Handle the driver rejecting the ride
        const passengerWs = clients.passengers[data.data.passengerId];
        if (passengerWs) {
          passengerWs.send(JSON.stringify({
            type: 'rideConfirmation',
            data: {
              status: 'Rejected',
              driverId: data.driverId,
            },
          }));
        }
      } if (data.type === 'startRide' && data.role === 'driver') {
        const passengerWs = clients.passengers[data.passenger_id];
        if (passengerWs) {
            passengerWs.send(JSON.stringify({
                type: 'rideStarted',
                location: data.location,
                passenger: data.passenger_id,
            }));
        } else {
            console.error(`Passenger with ID ${data.passenger_id} not connected`);
        }
    } else if (data.type === 'locationUpdate' && data.role === 'driver') {
        const passengerWs = clients.passengers[data.passenger_id];
        if (passengerWs) {
            passengerWs.send(JSON.stringify({
                type: 'locationUpdate',
                location: data.location,
                passenger: data.passenger_id,
            }));
        }
    }
    
      
    } catch (error) {
      console.error('Error processing message:', error.message);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');

    // Remove disconnected clients from `clients.passengers` or `clients.drivers`
    Object.entries(clients.passengers).forEach(([id, connection]) => {
      if (connection === ws) delete clients.passengers[id];
    });
    if (ws.driverId) {
      delete clients.drivers[ws.driverId]; // Remove driver from the map
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error.message);
  });
});
// API Endpoint to Fetch Connected Drivers
app.get('/api/connected-drivers', (req, res) => {
  console.log("Received request to fetch connected drivers."); // Debug: Request received

  try {
    const connectedDrivers = Object.keys(clients.drivers); // Get all driver IDs
    console.log(`Connected drivers: ${connectedDrivers}`); // Debug: Final connected drivers list
    res.json(connectedDrivers);
  } catch (error) {
    console.error("Error fetching connected drivers:", error); // Debug: Error handling
    res.status(500).json({ error: "Failed to fetch connected drivers" });
  }
});

const port = 8081;

app.listen(port, () => {
  console.log(`HTTP server is running on http://localhost:${port}`);
});

// Corrected module.exports
module.exports = app;
