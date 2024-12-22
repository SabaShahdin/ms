const { calculateDistance, calculateFare } = require('../rideRoutes');
const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../index'); // Assuming index.js starts the app
const db = require('../db'); // Import the database module

chai.use(chaiHttp);
const { expect } = chai;

describe('ride Routes', () => {
    describe('calculateDistance()', () => {
        it('should return correct distance between two GPS coordinates', () => {
            const distance = calculateDistance(31.5204, 74.3587, 31.5497, 74.3436);
            expect(distance).to.be.closeTo(3.63, 0.1);
        });

        it('should return 0 if both coordinates are the same', () => {
            const distance = calculateDistance(31.5204, 74.3587, 31.5204, 74.3587);
            expect(distance).to.equal(0);
        });
    });

    describe('calculateFare()', () => {
        it('should calculate the correct fare', () => {
            const fare = calculateFare('Car', 5, 50, 1.5);
            expect(fare).to.equal(57.5); // Correct expectation
        });
    
    
        it('should handle NaN inputs gracefully', () => {
            const fare = calculateFare('Car', NaN, 50);
            expect(fare).to.be.NaN;
        });

    });
    describe('GET /ride/api/vehicles', () => {
        it('should return vehicles with distance and fare for valid inputs', (done) => {
            chai.request(app)
                .get('/ride/api/vehicles?start=31.5789,74.3576&end=24.9325,67.0705&type=rickshaw')
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.be.an('array');
                    done();
                });
        });

        it('should return a 400 error for missing query parameters', (done) => {
            chai.request(app)
                .get('/ride/api/vehicles?start=31.5789,74.3576&end=&type=rickshaw')
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    done();
                });
        });

        it('should return a 404 error if no vehicles are found', (done) => {
            chai.request(app)
                .get('/api/vehicles?start=0,0&end=0,0&type=Car')
                .end((err, res) => {
                    expect(res).to.have.status(404);
                    done();
                });
        });

        it('should return a 500 error for database issues', (done) => {
            // Make the request to the route (using actual database)
            chai.request(app)
                .get('/ride/api/vehicles?start=31.5789,74.3576&end=24.9325,67.0705')
                .end((err, res) => {
                    // Debugging response output
                    console.log('Request sent. Response status:', res?.status);
                    console.log('Response body:', res?.body);
        
                    // Assertion: Expect a 500 status if there's a database error
                    expect(res).to.have.status(500);
        
                    // End the test
                    done();
                });
        });
        
    });
});
