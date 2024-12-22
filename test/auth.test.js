const request = require('supertest');
const expect = require('chai').expect;
const app = require('../index'); // Adjust the path to your main app file
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'sesss';

describe('Authentication Tests', () => {
  before(async () => {
    // Set up initial test data
    // Example: Clear the test database or insert specific records
  });

  after(async () => {
    // Clean up test data
  });

  describe('POST /signup', () => {
    it('should sign up a user successfully', (done) => {
      request(app)
        .post('/auth/signup')
        .send({
          username: 'newUser',
          email: 'newuser@example.com',
          password: 'password123',
          contact_number: '0987654321',
        })
        .end((err, res) => {
          expect(res.status).to.equal(201); // Successful signup
          expect(res.body).to.have.property('message', 'User registered successfully!');
          done();
        });
    });



    it('should return an error for duplicate username or email', (done) => {
      request(app)
        .post('/auth/signup')
        .send({
          username: 'newUser',
          email: 'newuser@example.com',
          password: 'password123',
          contact_number: '0987654321',
        })
        .end((err, res) => {
          expect(res.status).to.equal(400);
          expect(['Username already exists.', 'Email already exists.']).to.include(res.body.error);
          done();
        });
    });
  });

  describe('POST /signin', () => {
    it('should sign in a user and return a JWT token', async () => {
      const response = await request(app).post('/auth/signin').send({
        email: 'newuser@example.com',
        password: 'password123',
      });

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('token').that.is.a('string');
      expect(response.body).to.have.property('role', 'Passenger'); // Check the role
      expect(response.body).to.have.property('message', 'Signed in successfully');
    });

    it('should return error for non-existing user', async () => {
      const response = await request(app).post('/auth/signin').send({
        email: 'nonexistent@example.com',
        password: 'password123',
      });

      expect(response.status).to.equal(401);
      expect(response.body).to.have.property('error', 'Invalid credentials');
    });
  });

  describe('GET /get-user-data', () => {
    it('should return user data for a valid JWT token', async () => {
      const token = jwt.sign({ username: 'newUser' }, JWT_SECRET, { expiresIn: '1d' });

      const response = await request(app)
        .get('/auth/get-user-data')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).to.equal(200);
      expect(response.body.user.username).to.equal('newUser');
      expect(response.body).to.have.property('message', 'User authenticated successfully');
    });

    it('should return error for an invalid token', async () => {
      const response = await request(app)
        .get('/auth/get-user-data')
        .set('Authorization', 'Bearer invalidtoken');

      expect(response.status).to.equal(403);
      expect(response.body).to.have.property('error', 'Invalid token or token expired');
    });
  });

  describe('POST /refresh-token', () => {
    it('should return a new token for a valid refresh token', async () => {
      const refreshToken = jwt.sign({ username: 'newUser' }, JWT_SECRET, { expiresIn: '7d' });

      const response = await request(app)
        .post('/auth/refresh-token')
        .send({ refreshToken });

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('newToken').that.is.a('string');
      expect(response.body).to.have.property('message', 'New token generated');
    });

    it('should return error for missing refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh-token')
        .send({});

      expect(response.status).to.equal(400);
      expect(response.body).to.have.property('error', 'Refresh token is required');
    });
  });
});
