"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transporter = void 0;
const nodemailer = require("nodemailer");
exports.transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.forwardemail.net",
    port: 465,
    secure: true,
    auth: {
        // TODO: replace `user` and `pass` values from <https://forwardemail.net>
        user: "naren@infease.com",
        pass: "rnbz ypze xvcd cufi",
    },
});
//# sourceMappingURL=nodemailer.js.map