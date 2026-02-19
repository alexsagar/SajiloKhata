const jwt = require('jsonwebtoken');

// Mock User model
const mockUser = {
    _id: 'user123',
    email: 'test@test.com',
    isActive: true,
};

jest.mock('../models/User', () => ({
    findById: jest.fn(),
}));

const User = require('../models/User');
const { authenticateToken, generateTokens, verifyRefreshToken } = require('../middleware/auth');

describe('Auth Middleware', () => {
    const originalEnv = process.env;

    beforeAll(() => {
        process.env = {
            ...originalEnv,
            JWT_SECRET: 'test-secret-key',
            JWT_REFRESH_SECRET: 'test-refresh-secret-key',
            JWT_EXPIRES_IN: '15m',
            JWT_REFRESH_EXPIRES_IN: '7d',
        };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('authenticateToken', () => {
        test('returns 401 when no token is provided', async () => {
            const req = { cookies: {} };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            const next = jest.fn();

            await authenticateToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: 'Access token required' });
            expect(next).not.toHaveBeenCalled();
        });

        test('returns 401 when user is not found', async () => {
            const token = jwt.sign({ userId: 'user123' }, process.env.JWT_SECRET);
            const req = { cookies: { accessToken: token } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            const next = jest.fn();

            User.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue(null),
            });

            await authenticateToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });

        test('returns 401 when user is not active', async () => {
            const token = jwt.sign({ userId: 'user123' }, process.env.JWT_SECRET);
            const req = { cookies: { accessToken: token } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            const next = jest.fn();

            User.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue({ ...mockUser, isActive: false }),
            });

            await authenticateToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });

        test('returns 401 when token is expired', async () => {
            const token = jwt.sign({ userId: 'user123' }, process.env.JWT_SECRET, { expiresIn: '-1s' });
            const req = { cookies: { accessToken: token } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            const next = jest.fn();

            await authenticateToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: 'Token expired' });
            expect(next).not.toHaveBeenCalled();
        });

        test('returns 403 when token is invalid', async () => {
            const req = { cookies: { accessToken: 'invalid-token' } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            const next = jest.fn();

            await authenticateToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
            expect(next).not.toHaveBeenCalled();
        });

        test('calls next and sets req.user when token is valid', async () => {
            const token = jwt.sign({ userId: 'user123' }, process.env.JWT_SECRET);
            const req = { cookies: { accessToken: token } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            const next = jest.fn();

            User.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser),
            });

            await authenticateToken(req, res, next);

            expect(req.user).toEqual(mockUser);
            expect(next).toHaveBeenCalled();
        });

        test('reads token from accessToken cookie (not token cookie)', async () => {
            // This verifies the fix for the auth cookie mismatch
            const token = jwt.sign({ userId: 'user123' }, process.env.JWT_SECRET);
            const req = {
                cookies: {
                    token: 'wrong-cookie',  // Old cookie name - should be ignored
                    accessToken: token      // Correct cookie name
                }
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            const next = jest.fn();

            User.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser),
            });

            await authenticateToken(req, res, next);

            expect(req.user).toEqual(mockUser);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('generateTokens', () => {
        test('generates access and refresh tokens', () => {
            const { accessToken, refreshToken } = generateTokens('user123');

            expect(accessToken).toBeDefined();
            expect(refreshToken).toBeDefined();
            expect(typeof accessToken).toBe('string');
            expect(typeof refreshToken).toBe('string');
        });

        test('access token contains userId', () => {
            const { accessToken } = generateTokens('user123');
            const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

            expect(decoded.userId).toBe('user123');
        });

        test('refresh token contains userId', () => {
            const { refreshToken } = generateTokens('user123');
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

            expect(decoded.userId).toBe('user123');
        });
    });

    describe('verifyRefreshToken', () => {
        test('verifies valid refresh token', () => {
            const { refreshToken } = generateTokens('user123');
            const decoded = verifyRefreshToken(refreshToken);

            expect(decoded.userId).toBe('user123');
        });

        test('throws error for invalid refresh token', () => {
            expect(() => verifyRefreshToken('invalid-token')).toThrow();
        });

        test('throws error for expired refresh token', () => {
            const expiredToken = jwt.sign(
                { userId: 'user123' },
                process.env.JWT_REFRESH_SECRET,
                { expiresIn: '-1s' }
            );

            expect(() => verifyRefreshToken(expiredToken)).toThrow();
        });
    });
});
