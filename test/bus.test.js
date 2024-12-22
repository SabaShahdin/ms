const { calculateDistance, calculateFare } = require('../busRide');
const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../index'); // Assuming index.js starts the app
const db = require('../db'); // Import the database module

chai.use(chaiHttp);
const { expect } = chai;

describe('GET /bus/api/get-all-buses', () => {
    it('should return a 400 error if location parameters are invalid', (done) => {
        chai.request(app)
            .get('/api/get-all-buses?lat=31&lng=74')
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body.error).to.equal('Invalid location parameters. Please provide valid latitude and longitude.');
                done();
            });
    });
});
it('should return a 404 if no buses are found within a 7 km radius of the user\'s location', (done) => {
    // Use a location where no buses are available (e.g., remote location)
    chai.request(app)
        .get('/bus/api/get-all-buses?lat=31.0000&lng=74.0000') // Example coordinates
        .end((err, res) => {
            expect(res).to.have.status(404);
            expect(res.body.message).to.equal('No buses found within a 7 km radius of your location.');
            done();
        });
});
it('should return buses with fare and distance within a 7 km radius', (done) => {
    // Test with coordinates where buses are available
    chai.request(app)
        .get('/bus/api/get-all-buses?lat=31.5789&lng=74.3576')  // Example coordinates
        .end((err, res) => {
            expect(res).to.have.status(200);
            expect(res.body).to.be.an('array');
            expect(res.body[0]).to.have.property('fare');
            expect(res.body[0]).to.have.property('distance');
            done();
        });
});
it('should return a 500 error if there is a database query error', (done) => {
    // Mock the database query to simulate an error
    const originalQuery = db.query;
    db.query = (query, params, callback) => callback(new Error('Database query error'), null);

    chai.request(app)
        .get('/bus/api/get-all-buses?lat=31.5789&lng=74.3576')
        .end((err, res) => {
            expect(res).to.have.status(500);
            expect(res.body.error).to.equal('Database query error');
            // Restore original db.query function
            db.query = originalQuery;
            done();
        });
});
describe('GET /bus/api/get-bus-stops', () => {
    it('should return a 400 error if vehicle ID is not provided', (done) => {
        chai.request(app)
            .get('/bus/api/get-bus-stops')
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body.message).to.equal('Vehicle ID is required.');
                done();
            });
    });
});
it('should return a 404 error if no stops are found for the given bus', (done) => {
    chai.request(app)
        .get('/bus/api/get-bus-stops?vehicle_id=87')  // Non-existent vehicle ID
        .end((err, res) => {
            expect(res).to.have.status(500);
            expect(res.body.message).to.equal('No stops found for this bus.');
            done();
        });
});
it('should return bus stops for a valid bus', (done) => {
    chai.request(app)
        .get('/bus/api/get-bus-stops?vehicle_id=7')  // Example valid vehicle ID
        .end((err, res) => {
            expect(res).to.have.status(200);
            expect(res.body).to.be.an('array');
            expect(res.body[0]).to.have.property('stop_id');
            expect(res.body[0]).to.have.property('lat');
            expect(res.body[0]).to.have.property('lng');
            done();
        });
});
it('should return a 500 error if there is a database query error', (done) => {
    // Mock the database query to simulate an error
    const originalQuery = db.query;
    db.query = (query, params, callback) => callback(new Error('Database query error'), null);

    chai.request(app)
        .get('/bus/api/get-bus-stops?vehicle_id=1')
        .end((err, res) => {
            expect(res).to.have.status(500);
            expect(res.body.message).to.equal('Failed to retrieve bus stops.');
            // Restore original db.query function
            db.query = originalQuery;
            done();
        });
});
