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
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer_1 = require("../nodemailer");
var express = require("express");
var emailRouter = express.Router();
const User = require("../model/user.model");
emailRouter.post("/create/review", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, subject, html_template } = req.body;
        var mailOptions = {
            to: "gokulakrishnanr812@gmail.com",
            from: email,
            subject: subject,
            html: `${html_template}`,
        };
        nodemailer_1.transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
                return;
            }
            nodemailer_1.transporter.close();
        });
        return res.status(200).json({
            message: "Email has been sent",
            status: "success",
            code: 200,
            data: [],
            error: null,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "something went wrong !" });
    }
}));
emailRouter.post("/all", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { subject, html_template } = req.body;
        const users = yield User.find({}); // replace with your user model
        for (const user of users) {
            const mailOptions = {
                to: user.email,
                from: "your_email@example.com", // replace with your email
                subject: subject,
                html: html_template,
            };
            // Send email to each user
            nodemailer_1.transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    console.log(error);
                    return;
                }
                console.log("Email sent to:", user.email);
            });
        }
        nodemailer_1.transporter.close();
        return res.status(200).json({
            message: "Emails sent successfully",
            status: "success",
            code: 200,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Something went wrong!" });
    }
}));
module.exports = emailRouter;
//# sourceMappingURL=emailRoute.js.map