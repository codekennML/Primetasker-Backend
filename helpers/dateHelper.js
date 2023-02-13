const { format } = require("date-fns");

const formatDate = (date) => {
  const dateFormat = format(date, "yyyy-MM-dd");
  return dateFormat;
};

module.exports = { formatDate };
