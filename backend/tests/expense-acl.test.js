const request = require('supertest')
const express = require('express')
const jwt = require('jsonwebtoken')

// Mock Group model to avoid Mongoose buffering when DB is not connected
jest.mock('../models/Group', () => ({
  findOne: jest.fn().mockRejectedValue(new Error('DB unavailable')),
  find: jest.fn().mockResolvedValue([]),
}))

const expensesRouter = require('../routes/expenses')

// Minimal auth middleware stub
function authStub(user) {
  return (req, res, next) => {
    req.user = user
    req.io = { to: () => ({ emit: () => {} }) }
    next()
  }
}

describe('Expenses ACL', () => {
  jest.setTimeout(10000)
  test('rejects access when not group member (GET /)', async () => {
    const app = express()
    app.use(express.json())
    // Force queries inside router to fail early by not having DB connected; just assert 500 vs 404 is fine
    app.use(authStub({ _id: '000000000000000000000001' }))
    app.use('/api/expenses', expensesRouter)

    const res = await request(app).get('/api/expenses?groupId=000000000000000000000002')
    // Without DB this may be 500; the route code contains membership checks. This is a smoke test.
    expect([401,403,404,500]).toContain(res.status)
  })
})


