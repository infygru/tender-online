const nodemailer = require("nodemailer");
export const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.forwardemail.net",
  port: 465,
  secure: true,
  auth: {
    // TODO: replace `user` and `pass` values from <https://forwardemail.net>
    user: "gokulakrishnanr812@gmail.com",
    pass: "bwyj amyg pybn otfu",
  },
});
