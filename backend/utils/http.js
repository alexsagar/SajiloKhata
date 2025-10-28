exports.ok = (res, data, status=200) => res.status(status).json({ success:true, data });
exports.fail = (res, message, status=400, meta={}) =>
  res.status(status).json({ success:false, error:{ message, ...meta }});
