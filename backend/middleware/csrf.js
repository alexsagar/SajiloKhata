const crypto = require('crypto')

function generateCsrfToken() {
  return crypto.randomBytes(16).toString('hex')
}

function setCsrfCookie(req, res, next) {
  if (!req.cookies || !req.cookies['XSRF-TOKEN']) {
    const token = generateCsrfToken()
    res.cookie('XSRF-TOKEN', token, { httpOnly: false, sameSite: 'Lax', secure: !!process.env.COOKIE_SECURE, path: '/' })
  }
  next()
}

function verifyCsrf(req, res, next) {
  const method = req.method.toUpperCase()
  const isMutating = ['POST','PUT','PATCH','DELETE'].includes(method)
  if (!isMutating) return next()
  const header = req.headers['x-csrf-token']
  const cookie = req.cookies && req.cookies['XSRF-TOKEN']
  if (header && cookie && header === cookie) return next()
  return res.status(403).json({ success: false, error: 'CSRF token invalid' })
}

module.exports = { setCsrfCookie, verifyCsrf }


