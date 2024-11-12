const nodemailer = require("nodemailer");
export const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.forwardemail.net",
  port: 465,
  secure: true,
  auth: {
    // TODO: replace `user` and `pass` values from <https://forwardemail.net>
    user: "info@tenderonline.in",
    pass: "WP6i KMKN BF1p",
  },
});
