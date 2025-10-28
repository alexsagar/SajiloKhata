function ok(res, data = null, status = 200) {
  const body = { success: true }
  if (data !== null) body.data = data
  return res.status(status).json(body)
}

function fail(res, error = 'Error', status = 400, extra = {}) {
  const body = { success: false, error }
  return res.status(status).json({ ...body, ...extra })
}

module.exports = { ok, fail }


