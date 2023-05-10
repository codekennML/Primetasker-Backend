const { Paystack } = require("./config/paystack");
const User = require("../../model/User");
const { respond } = require("../../helpers/response");
const { Payments } = require("../../model/Payment");

const startPayment = async (req, res) => {
  const { amount, method } = req.body;

  if (!amount || !method) {
    respond(res, 400, "Error : Bad Request ", null, 400);
  }

  const currentUser = req.user;

  if (!currentUser) {
    respond(res, 401, "Unauthorized ", null, 401);
  }

  const user = await User.findById(currentUser);

  if (!user) {
    respond(res, 404, "No User Found", null, 404);
  }

  const email = user.email;
  const amountToPay = req.body?.amount;

  const userPay = new Paystack(user._id, "paystack", email, amountToPay);

  const paystackApiResponse = await userPay.initalizePayment();

  if (paystackApiResponse && paystackApiResponse?.status === false) {
    respond(
      res,
      404,
      "Error : Failed to validate payment Information",
      null,
      404
    );
  }

  res.redirect(paystackApiResponse.data.authorization_url);
};

const verifyPayment = async (req, res) => {
  const reference = req.query.reference;

  const payVerify = new Paystack(null, null, null, reference, null);

  const result = payVerify.verifyPayment();

  if (!result || result?.status === false) {
    console.log(result);
    // res.redirect()
  }
  console.log(result);

  //   const paySuccessData = {
  //     reference: result?.data.reference,
  //     userId: result?.data?.metadata?.initiator,
  //     status: result?.data?.status,
  //     channel: result.data.channel,
  //     currency: result.data.currency,
  //     amount: result.data.amount,
  //     gateway: result?.data?.metadata?.method,
  //   };

  //   console.log(paySuccessData);
  //   const paymentSaved  =  await Payments.create()
};

const getPaymentDetails = async (req, res) => {
  const paymentId = req.params;

  if (!paymentId) {
    respond(res, 400, "Error : No pay id  supplied", null, 400);
  }

  const transaction = await Payments.find(reference);

  if (!transaction) {
    respond(res, 404, "Success : No transaction found for that Id", null, 404);
  }

  respond(res, 200, "success : transaction fetched success", transaction, 200);
};

const UserPaymentDetails = async (req, res) => {
  const userId = req.params;

  if (!userId) {
    respond(res, 400, "Error : No user id  supplied", null, 400);
  }

  const userTransactions = await Payments.find(userId);

  if (!userTransactions) {
    respond(res, 404, "Success : No transaction found for that Id", null, 404);
  }

  respond(res, 200, "success : transactions fetched success", transaction, 200);
};

module.exports = {
  startPayment,
  verifyPayment,
  getPaymentDetails,
  UserPaymentDetails,
};
