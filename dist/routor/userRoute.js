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
const { transporter } = require("../nodemailer");
userRoute.post("/create/account", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { phone, email, msmeNo, password, subscriptionPackage, name, username, gstNo, } = req.body;
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        const newUser = new User({
            phone,
            email,
            msmeNo,
            password: hashedPassword,
            subscriptionPackage,
            name,
            username,
            gstNo,
        });
        yield newUser.save();
        const token = jsonwebtoken_1.default.sign({ userId: newUser._id }, "secretkey", {
            expiresIn: "354d",
        });
        res.status(201).json({
            message: "User registered successfully.",
            accessToken: token,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error registering user.");
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
            from: "no-reply@gmail.com",
            to: email,
            subject: ` ${OTP}  is Your OTP for Authentication at MightyPlanet`,
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
module.exports = userRoute;
//# sourceMappingURL=userRoute.js.map