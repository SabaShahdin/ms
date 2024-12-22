const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../index'); // Import the main server file
const db = require('../db'); // Import the database connection

chai.use(chaiHttp);
const { expect } = chai;

describe('GET /city/api/cities', () => {
    it('should return a list of unique cities', (done) => {
        chai.request(app)
            .get('/city/api/cities')
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.be.an('array');
                expect(res.body[0]).to.have.property('city');
                done();
            });
    });

    it('should return a 500 error if there is a database error', (done) => {
        const originalQuery = db.query;
       
        chai.request(app)
            .get('/city/api/cities')
            .end((err, res) => {
                expect(res).to.have.status(500);
                expect(res.body.error).to.equal('Database query failed');
                db.query = originalQuery; // Restore the original query function
                done();
            });
    });
});
describe('GET /city/api/get-buses', () => {
    it('should return buses between departure and destination cities', (done) => {
        chai.request(app)
            .get('city/api/get-buses')
            .query({ departureCity: 'Lahore', destinationCity: 'Faislabad' }) // Example cities
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.be.an('array');
                expect(res.body[0]).to.have.property('vehicle_id');
                done();
            });
    });

    it('should return a 400 error if parameters are missing', (done) => {
        chai.request(app)
            .get('/city/api/get-buses')
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body.error).to.equal('Both departure and destination cities are required.');
                done();
            });
    });

    it('should return a 500 error if there is a database query error', (done) => {
        const originalQuery = db.query;
      
        chai.request(app)
            .get('/city/api/get-buses')
            .query({ departureCity: 'Lahore', destinationCity: 'Karachi' })
            .end((err, res) => {
                expect(res).to.have.status(500);
                expect(res.body.error).to.equal('Internal server error');
                db.query = originalQuery;
                done();
            });
    });
});
describe('GET /city/api/get-route-details', () => {
    it('should return route details for a valid route ID', (done) => {
        chai.request(app)
            .get('/city/api/get-route-details')
            .query({ routeId: 1 }) // Example valid route ID
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.be.an('array');
                expect(res.body[0]).to.have.property('route_name');
                expect(res.body[0]).to.have.property('area_name');
                done();
            });
    });

    it('should return a 400 error if route ID is missing', (done) => {
        chai.request(app)
            .get('/city/api/get-route-details')
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body.error).to.equal('Route ID is required.');
                done();
            });
    });

    it('should return a 500 error if there is a database query error', (done) => {
        const originalQuery = db.query;
        db.query = (query, params, callback) => callback(new Error('Database error'), null);

        chai.request(app)
            .get('/city/api/get-route-details')
            .query({ routeId: 1 })
            .end((err, res) => {
                expect(res).to.have.status(500);
                expect(res.body.error).to.equal('Database error');
                db.query = originalQuery;
                done();
            });
    });
});
