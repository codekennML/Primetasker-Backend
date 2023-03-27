const respond = (res, status, message, data, rescode = 200) => {
  return res
    .status(status)
    .json({ message: message, data: data ? data : null, status: rescode });
};

module.exports = { respond };
