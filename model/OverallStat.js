const mongoose = require("mongoose");
const { Schema } = mongoose;

const overallStatSchema = Schema({
  yearlyBookingTotal: Number,
  yearlyTransactionTotal: Number,
  yearlyTaskTotal: Number,
  yearlyUserTotal: Number,
  yearlyBookingTotal: Number,
  year: Number,

  monthlyData: [
    {
      month: String,
      totalUsers: Number,
      totalTasks: Number,
      totalTransactions: Number,
      totalBookings: Number,
      totalRevenue: Number,
      totalCommissions: Number,
      totalPayout: Number,
      totalExpenses: Number,
      totalDispute: Number,
    },
  ],
  dailyData: [
    {
      date: Date,
      totalUsers: Number,
      totalTasks: Number,
      totalTransactions: Number,
      totalBookings: Number,
      totalRevenue: Number,
      totalCommissions: Number,
      totalPayout: Number,
      totalExpenses: Number,
      totalDispute: Number,
    },
  ],
});

overallStatSchema.index({});
module.exports = mongoose.model("OverallStat", overallStatSchema);
