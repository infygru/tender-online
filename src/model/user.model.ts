const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  companyName: { type: String, required: true },
  // array industry
  industry: { type: Array, required: false },
  // array classification
  classification: { type: Array, required: false },
});

const User = mongoose.model("tender-user", userSchema);

module.exports = User;
