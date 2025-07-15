import request from 'supertest';
import express from 'express';
import { authRoutes } from '@/controllers/auth';
import { logger } from '@/utils/logger';

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Auth Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@austa.com.br',
        password: 'testpassword123'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Authentication endpoint ready',
        data: {
          token: 'placeholder-jwt-token',
          user: {
            id: '1',
            email: loginData.email,
            name: 'Test User'
          }
        }
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Login attempt',
        { email: loginData.email }
      );
    });

    it('should handle login with empty credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBeUndefined();
    });

    it('should handle login errors', async () => {
      // Mock logger to throw an error
      jest.spyOn(logger, 'info').mockImplementation(() => {
        throw new Error('Login processing error');
      });

      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'Authentication failed'
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Login error',
        { error: expect.any(Error) }
      );
    });

    it('should log email but not password during login', async () => {
      const loginData = {
        email: 'security@test.com',
        password: 'secretpassword'
      };

      await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(logger.info).toHaveBeenCalledWith(
        'Login attempt',
        { email: loginData.email }
      );
      
      // Verify password is not logged
      const logCalls = (logger.info as jest.Mock).mock.calls;
      logCalls.forEach(call => {
        expect(JSON.stringify(call)).not.toContain(loginData.password);
      });
    });

    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400); // Express handles malformed JSON
    });
  });

  describe('POST /auth/register', () => {
    it('should register successfully with valid data', async () => {
      const registerData = {
        email: 'newuser@austa.com.br',
        password: 'newpassword123',
        name: 'New User'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(registerData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        message: 'Registration endpoint ready',
        data: {
          user: {
            id: '1',
            email: registerData.email,
            name: registerData.name
          }
        }
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Registration attempt',
        { email: registerData.email, name: registerData.name }
      );
    });

    it('should handle registration with partial data', async () => {
      const registerData = {
        email: 'partial@test.com'
        // Missing password and name
      };

      const response = await request(app)
        .post('/auth/register')
        .send(registerData);

      expect(response.status).toBe(201);
      expect(response.body.data.user.email).toBe(registerData.email);
      expect(response.body.data.user.name).toBeUndefined();
    });

    it('should handle registration errors', async () => {
      jest.spyOn(logger, 'info').mockImplementation(() => {
        throw new Error('Registration processing error');
      });

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'error@test.com',
          password: 'password',
          name: 'Error User'
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'Registration failed'
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Registration error',
        { error: expect.any(Error) }
      );
    });

    it('should log email and name but not password during registration', async () => {
      const registerData = {
        email: 'security@test.com',
        password: 'secretpassword',
        name: 'Security Test'
      };

      await request(app)
        .post('/auth/register')
        .send(registerData);

      expect(logger.info).toHaveBeenCalledWith(
        'Registration attempt',
        { email: registerData.email, name: registerData.name }
      );
      
      // Verify password is not logged
      const logCalls = (logger.info as jest.Mock).mock.calls;
      logCalls.forEach(call => {
        expect(JSON.stringify(call)).not.toContain(registerData.password);
      });
    });

    it('should handle empty registration data', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({});

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const refreshData = {
        refreshToken: 'valid-refresh-token'
      };

      const response = await request(app)
        .post('/auth/refresh')
        .send(refreshData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Token refresh endpoint ready',
        data: {
          token: 'new-placeholder-jwt-token',
          refreshToken: 'new-placeholder-refresh-token'
        }
      });
      expect(logger.info).toHaveBeenCalledWith('Token refresh attempt');
    });

    it('should handle refresh without refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('Token refresh attempt');
    });

    it('should handle refresh token errors', async () => {
      jest.spyOn(logger, 'info').mockImplementation(() => {
        throw new Error('Token refresh processing error');
      });

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'test-token' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'Token refresh failed'
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Token refresh error',
        { error: expect.any(Error) }
      );
    });

    it('should not log refresh token value for security', async () => {
      const refreshData = {
        refreshToken: 'secret-refresh-token-value'
      };

      await request(app)
        .post('/auth/refresh')
        .send(refreshData);

      expect(logger.info).toHaveBeenCalledWith('Token refresh attempt');
      
      // Verify refresh token value is not logged
      const logCalls = (logger.info as jest.Mock).mock.calls;
      logCalls.forEach(call => {
        expect(JSON.stringify(call)).not.toContain(refreshData.refreshToken);
      });
    });
  });

  describe('Auth Security', () => {
    it('should not expose sensitive information in error messages', async () => {
      const endpoints = ['/auth/login', '/auth/register', '/auth/refresh'];
      
      for (const endpoint of endpoints) {
        jest.spyOn(logger, 'info').mockImplementation(() => {
          throw new Error('Database connection failed with credentials: admin:password');
        });

        const response = await request(app)
          .post(endpoint)
          .send({ test: 'data' });

        expect(response.status).toBe(500);
        expect(response.body.message).not.toContain('admin');
        expect(response.body.message).not.toContain('password');
        expect(response.body.message).not.toContain('Database');
        
        jest.clearAllMocks();
      }
    });

    it('should handle concurrent requests without conflicts', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => 
        request(app)
          .post('/auth/login')
          .send({ email: `user${i}@test.com`, password: 'password' })
      );

      const responses = await Promise.all(requests);
      
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.data.user.email).toBe(`user${index}@test.com`);
      });
    });
  });
});