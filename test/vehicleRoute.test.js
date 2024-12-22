const request = require('supertest');
const expect = require('chai').expect;
const app = require('../index'); // Adjust the path to your main app file
const db = require('../db'); // Import the database connection

describe('GET /real/all-vehicles', () => {

  before(async () => {
    // Set up initial test data
    // Example: Clear the test database or insert specific records for testing
  });

  after(async () => {
    // Clean up test data (e.g., remove test records from the database)
  });

  // Test case 1: Successful data retrieval
  it('should return a list of vehicles for valid parameters', (done) => {
    // Assuming data is already in your test database
    request(app)
      .get('/real/all-vehicles')
      .query({ type: 'Car', status: 'Available', area: 'Gulberg' })
      .end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body).to.be.an('array');
        expect(res.body[0]).to.have.property('license_plate', 'CAR005'); // Adjust this check based on your data
        done();
      });
  });

  // Test case 2: Area not found
  it('should return 404 if the area is not found', (done) => {
    request(app)
      .get('/real/all-vehicles')
      .query({ type: 'Car', status: 'Available', area: 'no' })
      .end((err, res) => {
        expect(res.status).to.equal(404);
        expect(res.body).to.have.property('error', 'Area not found');
        done();
      });
  });

  // Test case 3: Database error while fetching area data
  it('should return 500 for a database error when fetching area data', (done) => {
    // Simulating a database error (you can use a test DB that you can control)
    db.query = (query, values, callback) => {
      callback(new Error('Database error'), null); // Simulating a DB error
    };

    request(app)
      .get('/real/all-vehicles')
      .query({ type: 'Rickshaw', status: 'Available', area: 'Gulberg' })
      .end((err, res) => {
        expect(res.status).to.equal(500);
        expect(res.body).to.have.property('error', 'Database query error while fetching area data');
        done();
      });
  });

  // Test case 4: Database error while fetching vehicles
  it('should return 500 for a database error when fetching vehicles', (done) => {
    // Simulating a database error
    db.query = (query, values, callback) => {
      if (query.includes('SELECT area_name')) {
        callback(null, [{ area_name: 'Gulberg' }]); // Area found
      } else {
        callback(new Error('Database error'), null); // Simulating vehicle data error
      }
    };

    request(app)
      .get('/real/all-vehicles')
      .query({ type: 'Car', status: 'Available', area: 'Gulberg' })
      .end((err, res) => {
        expect(res.status).to.equal(500);
        expect(res.body).to.have.property('error', 'Database query error while fetching vehicles');
        done();
      });
  });

  // Test case 5: Invalid or missing query parameters
it('should return 400 if required query parameters are missing', (done) => {
  request(app)
    .get('/real/all-vehicles')
    .query({ type: 'Car' }) // Missing 'status' and 'area'
    .end((err, res) => {
      
      // Assertion checks
      expect(res.status).to.equal(400);  // Expecting status 400 for missing parameters
      expect(res.body).to.have.property('error', 'Invalid parameters. Please provide valid area, type, and status.');
      
      done();
    });
});

});
