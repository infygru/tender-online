const nodemailer = require("nodemailer");
export const transporter = nodemailer.createTransport({
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
