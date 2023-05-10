const { respond } = require("../../helpers/response");
const Alert = require("../../model/Alerts");
const { nlp, its } = require("../../helpers/nlpHelpers");
const getAlerts = async (req, res) => {
  const user = req.user;

  if (!user) {
    respond(res, 400, "Error fetching alerts for unidentified user", null, 400);
  }

  const userAlerts = await Alert.find({ userId: user });

  if (!userAlerts) {
    respond(res, 404, "Error: No alerts found", null, 404);
  }

  respond(res, 200, "Success : Alerts fetched success", userAlerts, 200);
};

const createAlert = async (req, res) => {
  const { text, taskType, location, user } = req.body;

  // const user = req.user;

  // if (!user) {
  //   respond(res, 401, "Error : unidentified user", null, 400);
  // }

  //Lemmatize and stem  the text so it is easier to search for similar alerts when tasks are created

  const doc = nlp.readDoc(text);
  const tokens = doc.tokens();

  let stemmedTextArray = tokens
    .filter((token) => !token.out(its.stopWordFlag))
    .out(its.lemma && its.stem);

  const createdAlert = await Alert.create({
    userId: user,
    taskType,
    // place,
    text,
    stemmedTextArray,
  });

  if (!createdAlert) {
    respond(res, 409, "Error : Failed to create alert", null, 409);
  }

  respond(res, 200, "Success : Alert created success", createdAlert, 201);
};

const deleteAlert = async (req, res) => {
  const alertId = req.params;

  if (!req.user || !alertId) {
    respond(res, 400, "Error : Missing required data", null, 400);
  }

  var alertToDelete = await Alert.findById(alertId);

  if (!alertToDelete) {
    respond(
      res,
      404,
      "Error : No alert matching requested identifier",
      null,
      400
    );
  }

  alertToDelete = {
    ...alertToDelete,
    userDeleted: true,
  };

  const response = await alertToDelete.save();

  respond(res, 200, "Success : Alert Deleted Successfully", null, 200);
};
module.exports = {
  getAlerts,
  deleteAlert,
  createAlert,
};
