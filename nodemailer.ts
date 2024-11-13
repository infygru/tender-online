import nodemailer from "nodemailer";
export const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.forwardemail.net",
  port: 465,
  secure: true,
  auth: {
    // TODO: replace `user` and `pass` values from <https://forwardemail.net>
    user: "infygru@gmail.com",
    pass: "nlvo ujee pbjh nspm",
  },
});
