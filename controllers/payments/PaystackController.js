const { Paystack } = require("./config/paystack");
const User = require("../../model/User");
const { respond } = require("../../helpers/response");
const { Payments } = require("../../model/Payment");
const { generateRandomId } = require("../../helpers/createUniqId");
const { handlePaymentUserDeposit } = require("../../helpers/transactionUpdate");

const startPayment = async (req, res) => {
  const { amount } = req.body;
  console.log(amount);
  if (!amount) {
    return respond(res, 400, "Error : Bad Request ", null, 400);
  }

  const currentUser = req.user;

  console.log(currentUser);

  if (!currentUser) {
    return respond(res, 401, "Unauthorized ", null, 401);
  }

  const user = await User.findById(currentUser);

  if (!user) {
    return respond(res, 404, "No User Found", null, 404);
  }

  // const email = user.email;
  // const amountToPay = req.body?.amount;

  // const userPay = new Paystack(user._id, "paystack", email, amountToPay);

  // const paystackApiResponse = await userPay.initalizePayment();

  // if (paystackApiResponse && paystackApiResponse?.status === false) {
  //   respond(
  //     res,
  //     404,
  //     "Error : Failed to validate payment Information",
  //     null,
  //     404
  //   );
  // }

  // res.redirect(paystackApiResponse.data.authorization_url);

  const result = await handlePaymentUserDeposit(currentUser, amount);
  console.log("XL", result);
  if (result.error)
    return respond(res, 409, "Something went wrong ", null, 409);

  return respond(res, 201, "Deposit success", result.data, 201);

  //TODO: Remember to ensure the payment creation is retried if it fails and if it fails repeatedly, initiate a refund using paystack api
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

const handleWithdrawal = async (req, res) => {
  const { OTP, userId, amount } = req.body;

  const currentUser = req.user;

  if (userId !== currentUser || !OTP || !userId || !amount)
    return respond(res, 400, "Bad Request", null, 400);

  const user = await User.findById(userId);
  if (!user) return respond(res, 404, "User Nof Found", null, 404);

  if (user.balance < amount)
    return respond(res, 409, "Insufficient Funds", null, 409);

  //Add Paystack transfer function to user

  user.balance -= amount;

  const updatedUserWithBalance = await user.save();

  if (!updatedUserWithBalance)
    return respond(res, 409, "Operation Failed. Please try again");

  return respond(
    res,
    200,
    "Operation Success",
    updatedUserWithBalance.balance,
    200
  );
};

module.exports = {
  startPayment,
  verifyPayment,
  getPaymentDetails,
  UserPaymentDetails,
  handleWithdrawal,
};
