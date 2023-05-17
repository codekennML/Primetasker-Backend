const { v4: uuidv4 } = require("uuid");
const Task = require("../model/Task");

const generateRandomId = () => {
  const randomId = uuidv4();
  return randomId.toString();
};

const generateTaskTrackingCode = async () => {
  let trackingCode;
  const code = generateRandomId();

  const TaskWithIdenticalCode = await Task.findOne({
    "assigned.trackingCode": code,
    status: "Assigned",
  });

  if (TaskWithIdenticalCode !== null) {
    generateTaskTrackingCode();
  } else {
    trackingCode = code.substring(0, 8);
  }

  return trackingCode;
};

module.exports = { generateRandomId, generateTaskTrackingCode };
