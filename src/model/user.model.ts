const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: false },
    email: { type: String, required: true, unique: true }, // Ensure unique email addresses
    password: { type: String, required: true },
    companyName: { type: String, required: false, default: "" },
    state: { type: Array, default: ["tamil-nadu"] },
    isPayment: { type: Boolean, default: false },
    city: { type: String, required: false },
    address: { type: String, required: false },
    status: {
      type: String,
      enum: ["active", "inactive", "pending", "free"],
      default: "active",
    },
    industry: { type: Array, required: false },
    classification: { type: Array, required: false },
    paymentStatus: { type: String, default: "Pending" }, // Payment status: Pending, Completed, etc.
    freeTrailTime: { type: Date, default: new Date() },
    notificationSent: { type: Boolean, default: false },
    subscriptionValidity: { type: Date, required: false }, // New field for subscription validity
    profile_image: { type: String, required: false },
    isGoogleAuth: { type: Boolean, default: false },
    keyword: { type: Array, required: false },
    improvement: { type: String, required: false, default: "Texting" },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("tender-user", userSchema);
module.exports = User;
