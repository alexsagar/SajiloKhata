const mongoose = require('mongoose');

// Mock User model
jest.mock('../models/User', () => ({
    findById: jest.fn().mockResolvedValue({ _id: 'user1', email: 'test@test.com' }),
    findOne: jest.fn().mockResolvedValue(null),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
}));

// Mock Conversation model
jest.mock('../models/Conversation', () => ({
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ _id: 'conv1' }),
}));

// Mock email service
jest.mock('../services/emailService', () => ({
    sendEmail: jest.fn().mockResolvedValue(true),
}));

const FriendInvite = require('../models/FriendInvite');

describe('FriendInvite Status Workflow', () => {
    describe('Schema Validation', () => {
        test('status enum includes all valid statuses', () => {
            const statusPath = FriendInvite.schema.path('status');
            const validStatuses = statusPath.enumValues;

            expect(validStatuses).toContain('pending');
            expect(validStatuses).toContain('accepted');
            expect(validStatuses).toContain('expired');
            expect(validStatuses).toContain('revoked');
            expect(validStatuses).toContain('declined');
        });

        test('status defaults to pending', () => {
            const statusPath = FriendInvite.schema.path('status');
            expect(statusPath.defaultValue).toBe('pending');
        });

        test('declined status is valid', () => {
            const doc = new FriendInvite({
                code: 'test123',
                inviter: new mongoose.Types.ObjectId(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                status: 'declined',
            });

            const error = doc.validateSync();
            expect(error).toBeUndefined();
        });

        test('invalid status throws validation error', () => {
            const doc = new FriendInvite({
                code: 'test123',
                inviter: new mongoose.Types.ObjectId(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                status: 'invalid_status',
            });

            const error = doc.validateSync();
            expect(error).toBeDefined();
            expect(error.errors.status).toBeDefined();
        });
    });

    describe('Status Transitions', () => {
        test('pending can transition to accepted', () => {
            const doc = new FriendInvite({
                code: 'test123',
                inviter: new mongoose.Types.ObjectId(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                status: 'pending',
            });

            doc.status = 'accepted';
            const error = doc.validateSync();
            expect(error).toBeUndefined();
            expect(doc.status).toBe('accepted');
        });

        test('pending can transition to declined', () => {
            const doc = new FriendInvite({
                code: 'test123',
                inviter: new mongoose.Types.ObjectId(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                status: 'pending',
            });

            doc.status = 'declined';
            const error = doc.validateSync();
            expect(error).toBeUndefined();
            expect(doc.status).toBe('declined');
        });

        test('pending can transition to revoked', () => {
            const doc = new FriendInvite({
                code: 'test123',
                inviter: new mongoose.Types.ObjectId(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                status: 'pending',
            });

            doc.status = 'revoked';
            const error = doc.validateSync();
            expect(error).toBeUndefined();
            expect(doc.status).toBe('revoked');
        });

        test('pending can transition to expired', () => {
            const doc = new FriendInvite({
                code: 'test123',
                inviter: new mongoose.Types.ObjectId(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                status: 'pending',
            });

            doc.status = 'expired';
            const error = doc.validateSync();
            expect(error).toBeUndefined();
            expect(doc.status).toBe('expired');
        });
    });

    describe('Required Fields', () => {
        test('code is required', () => {
            const doc = new FriendInvite({
                inviter: new mongoose.Types.ObjectId(),
                expiresAt: new Date(),
            });

            const error = doc.validateSync();
            expect(error.errors.code).toBeDefined();
        });

        test('inviter is required', () => {
            const doc = new FriendInvite({
                code: 'test123',
                expiresAt: new Date(),
            });

            const error = doc.validateSync();
            expect(error.errors.inviter).toBeDefined();
        });

        test('expiresAt is required', () => {
            const doc = new FriendInvite({
                code: 'test123',
                inviter: new mongoose.Types.ObjectId(),
            });

            const error = doc.validateSync();
            expect(error.errors.expiresAt).toBeDefined();
        });

        test('inviteeEmail is optional', () => {
            const doc = new FriendInvite({
                code: 'test123',
                inviter: new mongoose.Types.ObjectId(),
                expiresAt: new Date(),
            });

            const error = doc.validateSync();
            expect(error?.errors?.inviteeEmail).toBeUndefined();
        });
    });
});
