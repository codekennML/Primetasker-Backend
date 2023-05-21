const mongoose = require("mongoose");
const Task = require("../model/Task");
const User = require("../model/User");
const Offer = require("../model/Offers");
const Transaction = require("../model/Transaction");
const Payment = require("../model/Payment");
const {
  generateRandomId,
  generateTaskTrackingCode,
} = require("./createUniqId");
const { ObjectId } = mongoose.Types;

const transactionOptions = {
  readPreference: "primary",
  readConcern: { level: "local" },
  writeConcern: { w: "majority" },
};

// Retry function to handle transaction retries
const retryTransaction = async (baseFunction, retryCount, ...args) => {
  let retries = 0;

  while (retries < retryCount) {
    try {
      const result = await baseFunction(...args);
      return result; // Transaction successful, return the result
    } catch (error) {
      console.error(`Transaction failed. Retry ${retries + 1}/${retryCount}`);
      retries++;
    }
  }

  throw new Error(`Transaction failed after ${retryCount} retries.`);
};
// const payAdmin = async (amount, admin, session) => {

//   const admin = await User.findById(process.env.ADMIN_ID, "balance", opts);

//   if (!admin) throw new Error("Something Went Wrong");

//   admin.balance = Number(admin.balance) + Number(amount);

// };

async function handleTaskAssignment(hostId, taskId, amount, offerId) {
  const session = await mongoose.startSession();

  try {
    const opts = { session };

    let result;

    await session.withTransaction(async () => {
      const sender = await User.findById(hostId, null, opts);

      const admin = await User.findById(process.env.ADMIN_ID, null, opts);

      if (!sender || !sender.active || !admin) {
        throw new Error("Account not Found");
      }

      if (sender.balance < amount) {
        throw new Error("Insufficient balance");
      }

      var task = await Task.findById(taskId, null, opts);

      if (!task) throw new Error("Task Not Found");

      const adminFee = Number(process.env.ADMIN_TASK_FEE);

      //Reduce sender balance and add taskFunds for to task Account
      sender.balance -= Number(amount);
      sender.taskFunds =
        Number(sender.taskFunds) + Number(amount) - Number(adminFee);

      admin.balance = Number(admin.balance) + Number(adminFee);
      admin.taskFunds =
        Number(admin.taskFunds) + Number(amount) - Number(adminFee);

      const newTransactions = [
        {
          type: 1, //booking-assignment charge
          taskId: taskId,
          senderId: hostId,
          receiverId: process.env.ADMIN_ID,
          amount: adminFee,
        },
        {
          type: 2, //assigned budget debit
          taskId: taskId,
          senderId: hostId,
          receiverId: process.env.ADMIN_ID,
          amount: Number(amount) - Number(adminFee),
        },
      ];

      const transaction = await Transaction.create(newTransactions, opts);

      if (!transaction) {
        throw new Error("Failed to create transaction");
      }

      const offer = task.offers.find((offer) => offer.toString() === offerId);
      //Ensure that the offer has not been deleted by the tasker
      if (!offer)
        return respond(res, 404, "Error : Offer Not Found", null, 404);

      const assignedOffer = await Offer.findOne(
        { _id: offerId },
        "createdBy offerAmount",
        opts
      )
        .populate({
          path: "createdBy",
          select: "firstname lastname avatar",
          model: User,
        })
        .lean();

      const trackingCode = await generateTaskTrackingCode();

      if (!trackingCode) throw new Error("Something went wrong");

      task.assigned = {
        assignedAt: new Date(),
        trackingCode: trackingCode,
        assigneeAvatar: assignedOffer.createdBy.avatar,
        assigneeId: assignedOffer.createdBy._id,
        assigneeFirstname: assignedOffer.createdBy.firstname,
        assigneeLastname: assignedOffer.createdBy.lastname,
      };

      task.budget.assignedBudget = assignedOffer.offerAmount;
      task.status = "Assigned";

      const updatedAdmin = await admin.save(opts);

      const updatedSender = await sender.save(opts);

      const updatedTask = await task.save(opts);

      if (!updatedTask || !updatedSender || !updatedAdmin)
        throw new Error("Operation Failed");

      // Transaction succeeded
      result = updatedTask;

      session.commitTransaction();
    });
    return { success: true, data: result };
  } catch (error) {
    // Transaction failed
    return { success: false, error: error.message };
  } finally {
    // End the session when the transaction is done
    session.endSession();
  }
}

async function handleAdminFeeDeduction(fromId, taskId, type, amount) {
  const session = await mongoose.startSession();

  try {
    const opts = { session };

    let result;

    await session.withTransaction(async () => {
      const sender = await User.findById(fromId, null, opts);

      const receiver = await User.findById(process.env.ADMIN_ID, null, opts);

      if (!sender || !sender.active || !receiver) {
        throw new Error("Oops, Something went wrong");
      }

      if (sender.balance < amount) {
        throw new Error("Insufficient balance.Minimum balance must be N300 ");
      }

      sender.balance -= amount;

      receiver.balance += amount;

      const newTransaction = {
        type: type, // 2 for booking fee, 3 for cancellation fee
        taskId: eventId,
        sender: sender._id,
        receiver: receiver._id,
        amount: amount,
      };

      const transaction = await Transaction.create(newTransaction);

      if (!transaction) {
        throw new Error("Oops, something went wrong");
      }

      await sender.save(opts);
      await receiver.save(opts);

      // Transaction succeeded
    });
    return { success: true, data: "Success" };
  } catch (error) {
    // Transaction failed
    session.abortTransaction();
    return { success: false, error: error.message };
  } finally {
    // End the session when the transaction is done
    session.endSession();
  }
}

async function handleTaskerCancellation(taskId, taskerId, hostId) {
  const session = mongoose.startSession();
  let result;
  try {
    (await session).withTransaction(async () => {
      const opts = { session };

      const tasker = await User.findById(taskerId, opts);
      const host = await User.findById(hostId, opts);
      const admin = await User.findById(process.env.ADMIN_ID, opts);

      //TODO: Send sms
      //  if (task.hostReleaseOTP !== OTP)
      // throw new Error ("Something went wrong ")

      // const admin = await User.findById(process.env.ADMIN_ID, null, opts);

      if (!tasker || !tasker.active) {
        throw new Error("Account not Found");
      }

      const task = await Task.findById(taskId);

      if (!task) throw new Error("Task Not Found");

      if (tasker._id !== task.assigned.assigneeId)
        throw new Error("Something went wrong ");

      // let funds = task.budget.assignedBudget;

      const refund = task.budget.assignedBudget;

      //Deduct thE task assigned price from the locked up taskFunds
      admin.taskFunds -= refund;

      //Refund the host
      host.taskFunds = host.taskFunds - refund;
      host.balance = host.balance + refund;

      //pay the receiver task final budget less adminfee

      const newTransactions = {
        type: 4, //Refund to Host
        taskId: task._id,
        receiverId: receiver._id,
        senderId: admin._id,
        amount: refund,
      };

      const transaction = await Transaction.create(newTransaction, opts);

      if (!transaction) throw new Error("Something went wrong ");

      task.assigned = {};
      task.status = "Cancelled";
      tasker.consecutiveCancellation += 1;

      if (tasker.consecutiveCancellation == 3) {
        //sendsms warning for consecutive cancellations
      }

      //Ban the user
      if (tasker.consecutiveCancellation >= 5) {
        tasker.active = false;
      }

      //TODO handle fund crediting  to tasker and admin

      const updatedTasker = await tasker.save(opts);
      const updatedHost = await host.save(opts);
      const updatedAdmin = await admin.save(opts);
      const finishedTask = await task.save(opts);

      if (!finishedTask || !updatedAdmin || !updatedTasker || !updatedHost)
        throw new Error("Something went wrong ");

      result = updatedTasker;

      await session.commitTransaction();
    });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
    await session.abortTransaction();
  } finally {
    session.endSession();
  }
}

async function handleHostCancellation(taskId, hostId) {
  const session = await mongoose.startSession();

  let result;
  try {
    await session.withTransaction(async () => {
      const opts = { session };

      const host = await User.findById(hostId, null, opts);

      //TODO: Send sms
      //  if (task.hostReleaseOTP !== OTP)
      // throw new Error ("Something went wrong ")

      const admin = await User.findById(process.env.ADMIN_ID, null, opts);

      if (!host || !host.active || !admin) {
        throw new Error("Account not Found");
      }

      const task = await Task.findById(taskId, null, opts);

      if (!task) throw new Error("Task Not Found");

      if (hostId !== task.creator.toString())
        throw new Error("Something went wrong ");

      const cancellationFee = 600;

      const refund = task.budget.assignedBudget;

      //Deduct c
      host.taskFunds = host.taskFunds - refund;

      host.balance = host.balance + refund - cancellationFee;

      //Process admin fees for the task final budget
      admin.balance = admin.balance + cancellationFee;

      //Deduct th task final budget from lockup
      admin.taskFunds -= refund;

      //pay the receiver task final budget less adminfee

      const newTransactions = [
        {
          type: 7, //cancellationFee,
          taskId: task._id,
          receiverId: admin._id,
          senderId: host._id,
          amount: cancellationFee,
        },

        {
          type: 4, //Refund to Host
          taskId: task._id,
          receiverId: host._id,
          senderId: admin._id,
          amount: refund - cancellationFee,
        },
      ];

      const transaction = await Transaction.create(newTransactions, opts);

      if (!transaction) throw new Error("Something went wrong ");

      task.status = "Cancelled";

      const updatedHost = await host.save(opts);
      const updatedAdmin = await admin.save(opts);
      const cancelledTask = await task.save(opts);

      if (!cancelledTask || !updatedAdmin || !updatedHost)
        throw new Error("Something went wrong ");

      result = updatedHost;
      session.commitTransaction();
    });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    session.endSession();
  }
}

async function handleOfferDeletion(user, taskId) {
  const session = await mongoose.startSession();

  let result;

  try {
    await session.withTransaction(async () => {
      const opts = { session };

      const offerToDelete = await Offer.findOneAndDelete(
        { taskId: taskId, createdBy: user },
        opts
      );

      if (!offerToDelete) {
        throw new Error("Not Found");
      }

      let offerTask = await Task.findOne({ _id: taskId });

      if (!offerTask) {
        throw new Error("No task found for this offer");
      }

      offerTask.offers = offerTask.offers.filter(
        (offerId) => {
          return JSON.stringify(offerId) !== JSON.stringify(offerToDelete._id);
        }

        // offerId !== offerToDelete._id
      );

      offerTask.offerCount = offerTask.offerCount - 1;

      if (offerTask.offers.length > 15) {
        offerTask.hasMoreOffers = true;
      } else {
        offerTask.hasMoreOffers = false;
      }

      if (offerTask.offerCount > 1) {
        offerTask.offers
          .sort((a, b) => b.getTimestamp() - a.getTimestamp())
          .slice(0, 15);
      }

      const modifiedTask = await offerTask.save(opts);

      if (!modifiedTask) {
        throw new Error("Task offer update failed");
      }

      result = offerToDelete;
    });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    session.endSession();
  }
}
async function handleOfferCreation(user, offerDetails) {
  const session = await mongoose.startSession();

  let result;

  try {
    await session.withTransaction(async () => {
      const opts = { session };

      let offerTask = await Task.findOne({ _id: offerDetails.taskId });

      if (!offerTask) {
        throw new Error("No task found for this offer");
      }

      //WARNING: to pass a `session` to `Model.create()` in Mongoose, you **must** pass an array as the first argument.

      const hasMadeOfferBefore = await Offer.find({
        taskId: offerDetails.taskId,
        createdBy: user,
      });

      if (hasMadeOfferBefore.length > 0) {
        throw new Error("Forbidden");
      }

      const offer = await Offer.create([offerDetails], opts);

      //This operation will return offer as an array instead  of an object

      if (!offer) {
        throw new Error("Failed to create offer");
      }

      offerTask.offers.push(offer[0]._id);
      offerTask.offerCount = offerTask.offerCount + 1;

      if (offerTask.offers.length > 15) {
        offerTask.hasMoreOffers = true;
      }
      if (offerTask.offers.length > 1) {
        offerTask.offers
          .sort((a, b) => b.getTimestamp() - a.getTimestamp())
          .slice(0, 15);
      }

      const modifiedTask = await offerTask.save(opts);

      if (!modifiedTask) {
        throw new Error("Task offer update failed");
      }
      result = offer;
    });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    session.endSession();
  }
}
async function handleReviewCreate(
  initiator,
  receiver,
  message,
  rating,
  taskId
) {
  const session = await mongoose.startSession();

  let result;

  try {
    await session.withTransaction(async () => {
      const opts = { session };

      const beneficiary = await User.findById(receiver);
      // const creator = await User.findById(creatorId)

      if (!beneficiary) throw new Error("Account does not exist");

      let task = await Task.findById(taskId);

      if (!task) {
        throw new Error(" Task Not found this review");
      }

      //A review can be made for a tasker by a host , also a host can make reviews for  a tasker

      if (
        initiator !== task.assigned.assigneeId ||
        task.creator ||
        receiver !== task.assigned.assigneeId ||
        task.creator
      )
        throw new Error("Forbidden");

      const newReview = {
        initiator: initiator,
        receiver: receiver,
        taskId: taskId,
        rating: rating,
        message: message,
      };

      const reviewToCreate = await Review.create(newReview, opts);

      if (!reviewToCreate) throw new Error("Something went wrong");

      beneficiary.averageRating =
        (beneficiary.averageRating * beneficiary.totalReviews +
          reviewToCreate.rating) /
        (beneficiary.totalReviews + 1);

      if (receiver === task.assigned.assigneeId)
        task.hostReviewForTasker = reviewToCreate._id;

      if (receiver === task.creator)
        task.taskerReviewForHost = reviewToCreate._id;

      const updatedBeneficiary = await beneficiary.save(opts);
      const updatedTask = await task.save(opts);

      if (!updatedTask || !updatedBeneficiary)
        throw new Error("Something went wrong");

      result = reviewToCreate;
    });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    session.endSession();
  }
}

async function handlePaymentUserDeposit(currentUser, amount) {
  const session = await mongoose.startSession();

  let result;

  try {
    await session.withTransaction(async () => {
      const opts = { session };

      const ref = generateRandomId();

      const paySuccessData = [
        {
          reference: ref,
          userId: currentUser,
          status: "success",
          channel: "cash",
          currency: "NGN",
          amount: amount,
          gateway: "Paystack",
        },
      ];

      const paymentSaved = await Payment.create(paySuccessData, opts);

      if (!paymentSaved) throw new Error("Operation Failed");

      const depositingUser = await User.findById(currentUser, null, opts);

      if (!depositingUser) throw new Error("Operation Failed");

      depositingUser.balance += Number(amount);

      const userWithUpdatedDeposit = await depositingUser.save(opts);

      if (!userWithUpdatedDeposit) throw new Error("Something went wrong");

      result = userWithUpdatedDeposit.balance;

      session.commitTransaction();
    });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    session.endSession();
  }
}

async function handlePaymentUserWithdrawal(currentUser, email, amount) {}

async function handleLockBudget(hostId, taskId) {
  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      const opts = { session };

      const host = await User.findById(hostId, null, opts);

      const admin = await User.findById(process.env.ADMIN_ID, null, opts);

      if (!host || !host.active || !admin) {
        throw new Error("Account not Found");
      }

      const task = await Task.findById(taskId, null, opts);

      if (!task) throw new Error("Task Not Found");

      const newBudget = task.budget.finalBudget;

      if (task.creator.toString() !== hostId) throw new Error("Forbidden");

      let response;

      if (Number(newBudget) > host.balance + task.budget.assignedBudget) {
        throw new Error("Insufficient Funds.");
      }

      const amountToAdd =
        Number(newBudget) - Number(task.budget.assignedBudget);

      let newTransaction;
      if (amountToAdd <= host.balance) {
        admin.taskFunds += amountToAdd;
        host.balance -= amountToAdd;
        host.taskFunds += amountToAdd;

        newTransaction = [
          {
            type: 5, //Add to budget before lock,
            taskId: task._id,
            receiverId: admin._id,
            senderId: host._id,
            amount: amountToAdd,
          },
        ];

        // const transaction = await Transaction.create(newTransaction, opts);
        // console.log(transaction);
        // if (!transaction) throw new Error("Something went wrong ");
      }

      //Create transaction to refund host and deduct admin taskFund
      // if (Number(newBudget) < Number(task.budget.assignedBudget)) {
      //   const amountGreaterBy =
      //     Number(newBudget) - Number(task.budget.assignedBudget);

      //   admin.taskFunds -= amountGreaterBy;
      //   host.balance += amountGreaterBy;
      //   host.taskFunds -= amountGreaterBy;

      //   newTransaction = [
      //     {
      //       type: 4, //Refund to host,
      //       taskId: task._id,
      //       receiverId: hostId,
      //       senderId: admin._id,
      //       amount: amountGreaterBy,
      //     },
      //   ];
      // }

      const transaction = await Transaction.create(newTransaction, opts);

      if (!transaction) throw new Error("Something went wrong ");

      task.step = "offerApproved";
      if (task.taskType === "Remote") task.status = "Processing";

      task.hostMarkedBudgetApproved = true;

      const processingTask = await task.save(opts);
      const updatedAdmin = await admin.save(opts);
      const updatedHost = await host.save(opts);

      if (!processingTask || !updatedAdmin || !updatedHost)
        throw new Error("Something went wrong");

      result = processingTask;

      await session.commitTransaction();
    });
    return { success: true, data: result };
  } catch (error) {
    console.log(error);
    // return { success: false, error: error.message };
  } finally {
    session.endSession();
  }
}

async function handleReleasePayment(currentUser, taskId, OTP, taskerId) {
  const session = await mongoose.startSession();

  let result;
  try {
    await session.withTransaction(async () => {
      const opts = { session };

      const task = await Task.findById(taskId, null, opts);

      if (!task) throw new Error("Task Not Found");

      //TODO: Send sms
      if (task.hostReleaseOTP !== Number(OTP))
        throw new Error("Something went wrong ");

      const host = await User.findById(currentUser, null, opts);

      const receiver = await User.findById(taskerId, null, opts);

      const admin = await User.findById(process.env.ADMIN_ID, null, opts);

      if (!host || !host.active || !admin || !receiver) {
        throw new Error("Account not Found");
      }

      if (
        currentUser !== task.creator.toString() ||
        taskerId !== task.assigned.assigneeId.toString()
      )
        throw new Error("Something went wrong ");

      const hostTransactionsForThisTask = await Transaction.find(
        { taskId: taskId, type: { $in: [2, 3] } },
        "amount type",
        opts
      ).lean();

      const debitsTotal = hostTransactionsForThisTask.reduce((acc, value) => {
        if (value.type !== 1 && value.type !== 4) {
          return acc + value.amount;
        }
        return acc;
      }, 0);

      const creditsTotal = hostTransactionsForThisTask.reduce((acc, value) => {
        if (value.type !== 1 && value.type === 4) {
          return a + value.amount;
        }
        return acc;
      }, 0);

      if (
        debitsTotal - creditsTotal > task.budget.finalBudget ||
        creditsTotal > debitsTotal
      )
        throw new Error("Under Review "); //Send a high priority fraud alert warning

      function getadminFee(funds) {
        let amount;

        if (funds <= 5000) {
          amount = 0.27 * funds;
        } else {
          amount = 0.25 * funds;
        }

        return amount > 5000 ? 5000 : amount;
      }

      const finalPay = task.budget.finalBudget;

      //Deduct completed task budget from host taskFunds
      host.taskFunds -= finalPay;

      //Process admin fees for the task final budget
      admin.balance = admin.balance + getadminFee(finalPay);
      //Deduct th task final budget from lockup
      admin.taskFunds -= finalPay;

      //pay the receiver task final budget less adminfee
      receiver.balance = receiver.balance + finalPay - getadminFee(finalPay);

      const newTransactions = [
        {
          type: 3, //credit receiver,
          taskId: task._id,
          receiverId: receiver._id,
          senderId: admin._id,
          amount: finalPay - getadminFee(finalPay),
        },

        {
          type: 6, //task completion charge
          taskId: task._id,
          receiverId: admin._id,
          senderId: receiver._id,
          amount: getadminFee(finalPay),
        },
      ];

      const transaction = await Transaction.create(newTransactions, opts);

      if (!transaction) throw new Error("Something went wrong ");

      task.hostMarkedComplete = true;
      task.hostReleasedPayment = true;
      task.status = "Completed";

      //TODO handle fund crediting  to tasker and admin

      const updatedReceiver = await receiver.save(opts);
      const updatedHost = await host.save(opts);
      const updatedAdmin = await admin.save(opts);

      const finishedTask = await task.save(opts);

      if (!finishedTask || !updatedAdmin || !updatedReceiver || !updatedHost)
        throw new Error("Something went wrong ");

      result = finishedTask;

      await session.commitTransaction();
    });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    session.endSession();
  }
}

module.exports = {
  handleTaskAssignment,
  handleAdminFeeDeduction,
  handleOfferCreation,
  handleOfferDeletion,
  handleReviewCreate,
  handlePaymentUserDeposit,
  handlePaymentUserWithdrawal,
  handleLockBudget,
  retryTransaction,
  handleTaskerCancellation,
  handleHostCancellation,
  handleReleasePayment,
  retryTransaction,
};
