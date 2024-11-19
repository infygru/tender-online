import mongoose from "mongoose";

// Define the schema for tracking price and payment history
const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "tender-user", // Changed to 'User'
      required: true,
    },
    amount_received: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    payment_date: {
      type: Date,
      default: Date.now, // Automatically set to the current date and time
    },
    payment_method: {
      type: String,
      enum: [
        "Credit Card",
        "Cash",
        "Bank Transfer",
        "PayPal",
        "Other",
        "Razorpay",
      ],
      required: true,
    },
    transaction_status: {
      type: String,
      enum: ["Pending", "Completed", "Failed"],
      default: "Pending",
    },

    discount_applied: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0.0,
    },
    tax_amount: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0.0,
    },
    total_amount_paid: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },
    content: {
      type: String,
      required: false,
      default: "Tender Payment",
    },
  },
  {
    // Add a timestamp to the schema
    timestamps: true,
  }
);

// Create and export the model
const TransactionModel = mongoose.model("Transaction", transactionSchema);

export default TransactionModel;
