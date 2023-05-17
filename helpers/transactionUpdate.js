const mongoose = require("mongoose");
const Task = require("../model/Task");
const User = require("../model/User");
const Offer = require("../model/Offers");
const Transaction = require("../model/Transaction");
const { JSONCookies } = require("cookie-parser");
const { ObjectId } = mongoose.Types;
const transactionOptions = {
  readPreference: "primary",
  readConcern: { level: "local" },
  writeConcern: { w: "majority" },
};

async function handleTaskAssignment(senderId, receiverId, taskId, amount) {
  const session = await mongoose.startSession();

  try {
    const opts = { session };

    let result;

    await session.withTransaction(async () => {
      const sender = await User.findById(senderId, null, opts);
      const receiver = await User.findById(receiverId, null, opts);

      if (!sender || !sender.active || !receiver || !receiver.active) {
        throw new Error("Sender or receiver account not found");
      }

      if (sender.balance < amount) {
        throw new Error("Insufficient balance");
      }

      //Reduce sender balance and add taskFunds for to task Account
      sender.balance -= amount;
      sender.taskFund += amount;

      //   const adminBill =  Number(amount * 0.3)

      //   const serviceCharge =  adminBill >  1500 ? 1500 : adminBill

      //   admin.taskFund +=  serviceCharge

      //Add funds to primetasker taskFunds account
      receiver.taskFund += amount;

      var task = await Task.findById(eventId);

      if (!task) throw new Error("Oops, something went wrong");

      Object.assign(task.budget, {
        finalBudget: amount,
      });

      const updatedTask = await task.save();

      if (!updatedTask) throw new Error("Oops, something went wrong");

      const newTransaction = {
        type: 1, //payment for task assigened
        taskId: eventId,
        sender: senderId,
        receiver: receiverId,
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
    return { success: true, data: "Budget save success" };
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

      //Reduce sender balance and add taskFunds for to task Account
      sender.balance -= amount;
      //   sender.taskFunds += amount;

      //   const adminBill =  Number(amount * 0.3)

      //   const serviceCharge =  adminBill >  1500 ? 1500 : adminBill

      //   admin.taskFund +=  serviceCharge

      //Add funds to primetasker taskFunds account
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
    console.error(error);
    return { success: false, error: error.message };
  } finally {
    // End the session when the transaction is done
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
      console.log("Hi", offerToDelete);

      let offerTask = await Task.findOne({ _id: taskId });

      if (!offerTask) {
        throw new Error("No task found for this offer");
      }
      console.log(offerTask.offers);

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
      console.log(offerDetails);

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

      console.log(offer);

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
      // console.log(modifiedTask);

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

module.exports = {
  handleTaskAssignment,
  handleAdminFeeDeduction,
  handleOfferCreation,
  handleOfferDeletion,
};
