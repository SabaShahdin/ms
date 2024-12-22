const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../index'); // Make sure to export your app in your main app file
const expect = chai.expect;

chai.use(chaiHttp);

describe('Booking Ride API Tests', () => {

    it('should book a ride successfully', (done) => {
        const rideData = {
            passenger_id: 1,
            vehicle_id: 1,
            pickup_latitude: 31.5497,
            pickup_longitude: 74.3436,
            dropoff_latitude: 31.5820,
            dropoff_longitude: 74.3290,
            ride_type: 'On-Demand',
            booking_time: '2024-12-09 12:00:00',
            fare: 100,
            scheduled_time: '2024-12-09 14:00:00',
            seats: 1,
            paymentMethod: 'Credit Card'
        };

        chai.request(app)
            .post('/api/book-ride')
            .send(rideData)
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body.message).to.equal('Ride booked successfully');
                expect(res.body).to.have.property('rideId');
                expect(res.body).to.have.property('passengerId');
                done();
            });
    });

    it('should return 400 for missing required fields', (done) => {
        const rideData = {
            passenger_id: 1,
            vehicle_id: 5,
            pickup_latitude: 31.5497,
            pickup_longitude: 74.3436,
            dropoff_latitude: 31.5820,
            dropoff_longitude: 74.3290,
            ride_type: 'standard',
            booking_time: '2024-12-09T12:00:00',
            fare: 100,
            scheduled_time: '2024-12-09T14:00:00',
            seats: 1
        };

        chai.request(app)
            .post('/api/book-ride')
            .send(rideData)
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body.message).to.equal('Missing required fields');
                done();
            });
    });

    it('should successfully update vehicle capacity', (done) => {
        const capacityData = {
            vehicle_id: 101,
            remaining_capacity: 3
        };

        chai.request(app)
            .post('/api/update-capacity')
            .send(capacityData)
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body.message).to.equal('Vehicle capacity updated successfully.');
                done();
            });
    });

    it('should return 400 for missing capacity data', (done) => {
        const capacityData = {
            vehicle_id: 101
        };

        chai.request(app)
            .post('/api/update-capacity')
            .send(capacityData)
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body.error).to.equal('Missing required parameters. Please provide vehicle_id and remaining_capacity.');
                done();
            });
    });

    it('should successfully book a bus ride', (done) => {
        const rideData = {
            passenger_id: 1,
            vehicle_id: 202,
            pickup_latitude: 31.5497,
            pickup_longitude: 74.3436,
            dropoff_latitude: 31.5820,
            dropoff_longitude: 74.3290,
            ride_type: 'bus',
            booking_time: '2024-12-09T12:00:00',
            fare: 150,
            scheduled_time: '2024-12-09T14:00:00',
            seats: 1,
            paymentMethod: 'debit'
        };

        chai.request(app)
            .post('/api/bus-book-ride')
            .send(rideData)
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body.message).to.equal('Ride booked successfully');
                expect(res.body).to.have.property('rideId');
                expect(res.body).to.have.property('passengerId');
                done();
            });
    });
});
