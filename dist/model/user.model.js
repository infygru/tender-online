const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    msmeNo: { type: String, required: true },
    gstNo: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    subscriptionPackage: { type: String, required: true },
});
const User = mongoose.model("tender-user", userSchema);
module.exports = User;
//# sourceMappingURL=user.model.js.map