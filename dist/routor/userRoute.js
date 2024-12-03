"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const userRoute = express.Router();
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User = require("../model/user.model");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const otpTemplate_1 = require("../templete/otpTemplate");
const banner_model_1 = __importDefault(require("../model/banner.model"));
const tender_mapping_model_1 = __importDefault(require("../model/tender.mapping.model"));
const tender_priceing_model_1 = __importDefault(require("../model/tender.priceing.model"));
const { transporter } = require("../nodemailer");
const authenticateUser = (req, res, next) => {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1]; // Get token from header
    if (!token) {
        return res.status(401).json({ message: "No token provided." });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, "secretkey");
        req.user = { userId: decoded.userId };
        next(); // Proceed to next middleware or route handler
    }
    catch (error) {
        console.error("Token verification failed:", error);
        return res.status(401).json({ message: "Invalid token." });
    }
};
userRoute.post("/create/account", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { phone, email, password, name, companyName, isGoogleAuth, profile_image, } = req.body;
        const getLastClientId = () => __awaiter(void 0, void 0, void 0, function* () {
            const lastClient = yield User.findOne()
                .sort({ clientId: -1 }) // Sort by clientId in descending order
                .exec();
            return (lastClient === null || lastClient === void 0 ? void 0 : lastClient.clientId) || null; // Return the clientId or null if no documents
        });
        const incrementClientId = (clientId) => {
            const prefix = clientId.slice(0, 3); // Extract the prefix, e.g., "#TO"
            const number = parseInt(clientId.slice(3), 10); // Extract the numeric part
            const nextNumber = (number + 1).toString().padStart(4, "0"); // Increment and pad
            return `${prefix}${nextNumber}`;
        };
        var clientId = 0;
        // Example
        getLastClientId().then((lastClientId) => {
            const newClientId = incrementClientId(lastClientId || "#TO0000");
            clientId = newClientId;
            console.log("New Client ID:", newClientId);
        });
        // Validate the user input
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        // Check if the email or phone number already exists
        const existingUser = yield User.findOne({
            $or: [{ email }, { phone }],
        });
        if (existingUser) {
            return res
                .status(200)
                .json({ message: "User already exists.", code: 400 });
        }
        // Calculate default free 3-day subscription validity
        const subscriptionValidity = new Date();
        subscriptionValidity.setDate(subscriptionValidity.getDate() + 3);
        // Create a new user with the 3-day free subscription validity
        const newUser = new User({
            phone,
            email,
            password: hashedPassword,
            name,
            companyName,
            subscriptionValidity, // Add the default 3-day subscription
            isGoogleAuth,
            profile_image,
            clientId,
        });
        yield newUser.save();
        // Generate JWT token for the newly created user
        const token = jsonwebtoken_1.default.sign({ userId: newUser._id }, "secretkey", {
            expiresIn: "354d",
        });
        res.status(201).json({
            message: "User registered successfully.",
            accessToken: token,
            subscriptionValidity, // Return the subscription validity to the user
            clientId,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error registering user.");
    }
}));
userRoute.post("/create/account/google", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, name, picture, isGoogleAuth } = req.body;
        // Reuse the client ID generation logic from the previous route
        const getLastClientId = () => __awaiter(void 0, void 0, void 0, function* () {
            const lastClient = yield User.findOne().sort({ clientId: -1 }).exec();
            return (lastClient === null || lastClient === void 0 ? void 0 : lastClient.clientId) || null;
        });
        const incrementClientId = (clientId) => {
            const prefix = clientId.slice(0, 3);
            const number = parseInt(clientId.slice(3), 10);
            const nextNumber = (number + 1).toString().padStart(4, "0");
            return `${prefix}${nextNumber}`;
        };
        // Get the last client ID and generate a new one
        const lastClientId = yield getLastClientId();
        const clientId = incrementClientId(lastClientId || "#TO0000");
        // Check if the user already exists
        const existingUser = yield User.findOne({ email });
        if (existingUser) {
            // If user exists, generate a JWT token
            const token = jsonwebtoken_1.default.sign({ userId: existingUser._id }, "secretkey", {
                expiresIn: "354d",
            });
            return res.status(200).json({
                message: "User already exists.",
                accessToken: token,
                subscriptionValidity: existingUser.subscriptionValidity,
                clientId: existingUser.clientId, // Return existing client ID
            });
        }
        // Create a new user with the generated client ID
        const newUser = new User({
            email,
            name,
            profile_image: picture,
            phone: "",
            subscriptionValidity: new Date(new Date().setDate(new Date().getDate() + 3)),
            isGoogleAuth: true,
            password: "google", // Default password for Google-authenticated users
            clientId, // Add the generated client ID
        });
        yield newUser.save();
        // Generate a JWT token for the newly created user
        const token = jsonwebtoken_1.default.sign({ userId: newUser._id }, "secretkey", {
            expiresIn: "354d",
        });
        res.status(201).json({
            message: "User registered successfully.",
            accessToken: token,
            subscriptionValidity: newUser.subscriptionValidity,
            clientId, // Return the new client ID
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error registering user with Google.");
    }
}));
userRoute.post("/success/payment", authenticateUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { paymentId, amount, duration } = req.body;
    const userId = req.user.userId;
    try {
        // Find the user and update payment status
        const user = yield User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        let validityDuration;
        if (duration === "Per Month") {
            validityDuration = 30;
        }
        else if (duration === "Per Half Year") {
            validityDuration = 182;
        }
        else if (duration === "Per Year") {
            validityDuration = 365;
        }
        else {
            return res.status(400).json({ message: "Invalid duration value" });
        }
        // Calculate the new subscription validity date
        let subscriptionValidity = new Date();
        // Check if the current subscription is still valid
        if (user.subscriptionValidity && user.subscriptionValidity > new Date()) {
            // If the existing subscription is valid, extend it from the current subscriptionValidity
            subscriptionValidity = new Date(user.subscriptionValidity);
        }
        // Extend the subscription by adding the validity duration
        subscriptionValidity.setDate(subscriptionValidity.getDate() + validityDuration);
        // Validate if subscriptionValidity is a valid date
        if (isNaN(subscriptionValidity.getTime())) {
            return res
                .status(400)
                .json({ message: "Invalid subscription validity date" });
        }
        // Update user payment status and subscription validity
        user.isPayment = true;
        user.paymentStatus = "Completed";
        user.subscriptionValidity = subscriptionValidity;
        yield user.save();
        res.status(200).json({
            message: "Payment successful",
            subscriptionValidity,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred", error });
    }
}));
userRoute.post("/payment/success/executive", authenticateUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a.userId;
        console.log(userId, "userId");
        const { amount_received, payment_method, content } = req.body;
        const transaction = new tender_priceing_model_1.default({
            userId,
            amount_received,
            price: amount_received,
            payment_method,
            total_amount_paid: amount_received,
            transaction_status: "Completed",
            discount_applied: 0.0,
            tax_amount: 0.0,
            content,
        });
        yield transaction.save();
        res.status(200).json({
            code: 200,
            message: "Payment successful",
            transaction,
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "An error occurred", error });
    }
}));
userRoute.get("/payment/transcation", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const transactions = yield tender_priceing_model_1.default.find({}).populate("userId");
        res.status(200).send(transactions);
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error getting transactions.");
    }
}));
// forgot password
userRoute.post("/forgot/password", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const password = req.body.password;
        const email = req.body.email;
        if (!("email" in req.body)) {
            return res.status(400).json({
                status: "failed",
                status_code: 400,
                message: "email keyword Does Not Exist In Request",
                result: {},
            });
        }
        // change new password handler
        const user = yield User.findOne({ email });
        if (!user) {
            return res.status(404).send("User not found.");
        }
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        user.password = hashedPassword;
        yield user.save();
        res.status(200).send({
            message: "Password changed successfully.",
            code: 200,
            newPassword: password,
        });
    }
    catch (err) {
        return res.status(400).send({
            status: "failed",
            status_code: 400,
            message: "Something went wrong!",
            result: {},
        });
    }
}));
// Utility function to add days to a date
const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};
userRoute.get("/status", authenticateUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    try {
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.userId;
        if (!userId) {
            return res.status(400).json({ message: "User ID is required." });
        }
        const user = yield User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        // const currentTime = new Date()
        const currentTime = new Date();
        const freeTrialStart = user.subscriptionValidity || currentTime; // Use current time if no start time is set
        const tendersVisibleUntil = freeTrialStart;
        const isTendersVisible = tendersVisibleUntil > currentTime;
        console.log(currentTime, "currentTime");
        console.log(tendersVisibleUntil, "tendersVisibleUntil");
        res.status(200).json({
            userId: user._id,
            tendersVisibleUntil,
            isTendersVisible,
            paymentStatus: user.paymentStatus,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error getting user status." });
    }
}));
userRoute.get("/get/account", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield User.find();
        res.status(200).send(users);
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error getting users.");
    }
}));
// Login API
userRoute.post("/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const user = yield User.findOne({ email });
        if (!user) {
            return res.status(404).send("User not found.");
        }
        const isGoogleAuth = user.isGoogleAuth;
        if (user.status === "Inactive") {
            return res.status(200).json({
                message: "Your account has been deactivated. Please contact support.",
                code: 401,
            });
        }
        const passwordMatch = yield bcryptjs_1.default.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).send("Invalid password.");
        }
        const token = jsonwebtoken_1.default.sign({ userId: user._id }, "secretkey", {
            expiresIn: "354d",
        });
        res.status(200).send({ token });
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error logging in.");
    }
}));
userRoute.post("/google/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        const user = yield User.findOne({ email });
        if (!user) {
            return res.status(200).json({
                message: "User not found.",
                code: 404,
            });
        }
        // Assuming you may want to add more checks or handle user creation here
        const token = jsonwebtoken_1.default.sign({ userId: user._id }, "secretkey"); // Use a consistent secret key
        res.status(200).send({ token });
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error logging in.");
    }
}));
userRoute.post("/otp", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const email = req.body.email;
        if (!("email" in req.body)) {
            return res.status(400).json({
                status: "failed",
                status_code: 400,
                message: "email keyword Does Not Exist In Request",
                result: {},
            });
        }
        // req.body.email = user_data.email
        // OTP handler
        var digits = "0123456789";
        let OTP = "";
        for (let i = 0; i < 6; i++) {
            OTP += digits[Math.floor(Math.random() * 10)];
        }
        let sendMessage = {
            from: "noreply@tenderonline.in",
            to: email,
            subject: ` ${OTP} is Your OTP for Authentication at Tenderonline`,
            html: (0, otpTemplate_1.Otp_template)(OTP),
        };
        transporter.sendMail(sendMessage, function (err, info) {
            console.log("err ********", err);
            console.log("info ********", info);
            if (err) {
                console.log(err);
                return res.status(400).send({
                    status: "failed",
                    status_code: 400,
                    message: err,
                    result: {},
                });
            }
            else {
                return res.status(200).send({
                    status: "success",
                    status_code: 200,
                    message: "mail send successfully",
                    result: [
                        {
                            otp: OTP,
                        },
                    ],
                });
            }
        });
    }
    catch (err) {
        return res.status(400).send({
            status: "failed",
            status_code: 400,
            message: "Something went wrong!",
            result: {},
        });
    }
}));
userRoute.post("/admin/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const AdminEmail = "admin@tenderonline.co.in";
        const AdminPassword = "TO_admin@555";
        if (email !== AdminEmail) {
            return res.status(404).send("User not found.");
        }
        if (password !== AdminPassword) {
            return res.status(401).send("Invalid password");
        }
        const token = jsonwebtoken_1.default.sign({ email, password }, "secretkey", {
            expiresIn: "354d",
        });
        res.status(200).send({ token });
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error logging in.");
    }
}));
userRoute.get("/me", authenticateUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const user = yield User.findById(userId);
        if (!user) {
            return res.status(404).send("User not found.");
        }
        res.status(200).send(user);
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error getting user.");
    }
}));
userRoute.post("/suggestion", authenticateUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { classification, industry, state } = req.body;
        if (!classification || !industry || !state) {
            return res.status(400).send("All fields are required.");
        }
        const userId = req.user.userId;
        const user = yield User.findById(userId);
        if (!user) {
            return res.status(404).send("User not found.");
        }
        user.classification = classification;
        user.industry = industry;
        user.state = state;
        yield user.save();
        res.status(200).send({
            message: "User details updated successfully.",
            user,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error getting user.");
    }
}));
// check user already added suggestion or not
userRoute.get("/suggestion/check", authenticateUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const user = yield User.findById(userId);
        if (!user) {
            return res.status(404).send("User not found.");
        }
        if (user.classification && user.industry && user.state) {
            return res.status(200).send({
                message: "User has already added suggestions.",
                suggestion: {
                    classification: user.classification,
                    industry: user.industry,
                    state: user.state,
                },
            });
        }
        else {
            return res.status(200).send({
                message: "User has not added any suggestions yet.",
            });
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error checking user suggestions.");
    }
}));
userRoute.get("/users", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const search = req.query.search;
        // If search query is provided, filter users based on name or email
        const query = search
            ? {
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { phone: { $regex: search, $options: "i" } },
                    { companyName: { $regex: search, $options: "i" } },
                ],
            }
            : {};
        const users = yield User.find(query);
        res.status(200).send(users);
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error getting users.");
    }
}));
// delete user with id /users/:id
userRoute.delete("/users/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found.", code: 404 });
        }
        res.status(200).json({
            message: "User deleted successfully.",
            code: 200,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error deleting user.");
    }
}));
// update user status with id /users/:id/status
userRoute.patch("/users/:id/status", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found.", code: 404 });
        }
        console.log(req.body.status, user, "req.body.status");
        user.status = req.body.status;
        yield user.save();
        res.status(200).json({
            message: "User status updated successfully.",
            code: 200,
            status: user.status,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error updating user status.");
    }
}));
userRoute.post("/banner", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { banner, isSignup, isActive } = req.body;
        // Validation: Ensure the 'banner' field exists and is not empty
        if (!banner || typeof banner !== "string" || banner.trim() === "") {
            return res.status(400).send({ error: "Invalid banner data." });
        }
        // Check if a banner already exists (assuming you only ever have one banner)
        const existingBanner = yield banner_model_1.default.findOne();
        if (existingBanner) {
            // If a banner already exists, update it
            existingBanner.banner = banner;
            existingBanner.isSignup = isSignup;
            existingBanner.isActive = isActive;
            yield existingBanner.save();
            return res.status(200).send({
                message: "Banner updated successfully.",
                banner: existingBanner,
            });
        }
        else {
            // If no banner exists, create a new one
            const newBanner = yield banner_model_1.default.create({
                banner,
                isSignup,
                isActive,
            });
            return res
                .status(201)
                .send({ message: "Banner created successfully.", banner: newBanner });
        }
    }
    catch (error) {
        console.error("Error processing banner request:", error);
        return res.status(500).send({ error: "Error adding/updating banner." });
    }
}));
userRoute.get("/banner", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const banner = yield banner_model_1.default.findOne();
        return res.status(200).send({ banner });
    }
    catch (error) {
        console.error("Error fetching banner:", error);
        return res.status(500).send({ error: "Error fetching banner." });
    }
}));
userRoute.put("/me", authenticateUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _c;
    try {
        const userId = (_c = req.user) === null || _c === void 0 ? void 0 : _c.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const user = yield User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        // Extract and update user fields dynamically
        const updateFields = req.body;
        Object.keys(updateFields).forEach((field) => {
            if (updateFields[field]) {
                user[field] = updateFields[field];
            }
        });
        yield user.save();
        res.status(200).json({
            message: "User profile updated successfully.",
            user,
        });
    }
    catch (error) {
        console.error("Error updating user profile:", error);
        res
            .status(500)
            .json({ message: "An error occurred while updating the user profile." });
    }
}));
userRoute.get("/me/tender", authenticateUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const mappings = yield tender_mapping_model_1.default.find({ userId })
            .populate("tenderId userId")
            .sort({ createdAt: -1 });
        res.status(200).json({ mappings });
    }
    catch (error) {
        console.log("Error retrieving mappings:", error);
        res.status(500).json({ message: "Error retrieving mappings.", error });
    }
}));
userRoute.post("/change-password", authenticateUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const { currentPassword, newPassword } = req.body;
        const user = yield User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        // const passwordMatch = await bcrypt.compare(currentPassword, user.password);
        // if (!passwordMatch) {
        //   return res.status(401).json({ message: "Invalid password." });
        // }
        const hashedPassword = yield bcryptjs_1.default.hash(newPassword, 10);
        user.password = hashedPassword;
        yield user.save();
        res.status(200).json({ message: "Password updated successfully." });
    }
    catch (error) {
        console.error("Error updating password:", error);
        res
            .status(500)
            .json({ message: "An error occurred while updating the password." });
    }
}));
// keyword suggestion
userRoute.post("/keyword/suggestion", authenticateUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { keyword } = req.body;
        if (!keyword) {
            return res.status(400).send("Invalid keyword data.");
        }
        const userId = req.user.userId;
        const user = yield User.findById(userId);
        if (!user) {
            return res.status(404).send("User not found.");
        }
        // add keyword to user if already not exist
        if (!user.keyword.includes(keyword)) {
            user.keyword.push(keyword);
        }
        yield user.save();
        res.status(200).send({
            message: "User keyword updated successfully.",
            user,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error getting user.");
    }
}));
// get user keyword
userRoute.get("/keyword", authenticateUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const user = yield User.findById(userId);
        if (!user) {
            return res.status(404).send("User not found.");
        }
        return res.status(200).send({
            message: "User keyword list.",
            keyword: user.keyword,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error getting user keyword.");
    }
}));
// message improvement
userRoute.post("/message", authenticateUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.userId;
        const { message } = req.body;
        // Validation: Ensure the 'message' field exists and is not empty
        if (!message || typeof message !== "string" || message.trim() === "") {
            return res.status(400).send({ error: "Invalid message data." });
        }
        // Check if a message already exists (assuming you only ever have one message)
        const existingMessage = yield User.findById(userId);
        if (existingMessage) {
            // If a message already exists, update it
            existingMessage.improvement = message;
            yield existingMessage.save();
            return res.status(200).send({
                message: "Message updated successfully.",
                improvement: existingMessage,
            });
        }
    }
    catch (error) {
        console.error("Error processing message request:", error);
        return res.status(500).send({ error: "Error adding/updating message." });
    }
}));
module.exports = userRoute;
//# sourceMappingURL=userRoute.js.map