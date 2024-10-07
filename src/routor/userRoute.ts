const express = require("express");
const userRoute = express.Router();
import bcrypt from "bcryptjs";
import { NextFunction, Request, Response } from "express";
const User = require("../model/user.model");
import jwt from "jsonwebtoken";
import { Otp_template } from "../templete/otpTemplate";
const { transporter } = require("../nodemailer");

userRoute.post("/create/account", async (req: Request, res: Response) => {
  try {
    const {
      phone,
      email,
      password,
      name,
      companyName,
      industry,
      classification,
    } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      phone,
      email,
      password: hashedPassword,
      name,
      companyName,
      industry,
      classification,
    });

    await newUser.save();
    const token = jwt.sign({ userId: newUser._id }, "secretkey", {
      expiresIn: "354d",
    });
    res.status(201).json({
      message: "User registered successfully.",
      accessToken: token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error registering user.");
  }
});

userRoute.get("/get/account", async (req: Request, res: Response) => {
  try {
    const users = await User.find();
    res.status(200).send(users);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error getting users.");
  }
});

// Login API
userRoute.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send("User not found.");
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).send("Invalid password.");
    }
    const token = jwt.sign({ userId: user._id }, "secretkey", {
      expiresIn: "354d",
    });
    res.status(200).send({ token });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error logging in.");
  }
});

userRoute.post("/otp", async (req: Request, res: Response) => {
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
      html: Otp_template(OTP),
    };

    transporter.sendMail(sendMessage, function (err: any, info: any) {
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
      } else {
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
  } catch (err) {
    return res.status(400).send({
      status: "failed",
      status_code: 400,
      message: "Something went wrong!",
      result: {},
    });
  }
});

const authenticateUser = (req: any, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1]; // Get token from header

  if (!token) {
    return res.status(401).json({ message: "No token provided." });
  }

  try {
    const decoded = jwt.verify(token, "secretkey"); // Verify token
    req.user = { userId: (decoded as { userId: string }).userId }; // Attach userId to req.user
    next(); // Proceed to next middleware or route handler
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).json({ message: "Invalid token." });
  }
};

userRoute.post("/admin/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const AdminEmail = "admin@tenderonline.in";
    const AdminPassword = "admin@123";

    if (email !== AdminEmail) {
      return res.status(404).send("User not found.");
    }

    if (password !== AdminPassword) {
      return res.status(401).send("Invalid password");
    }

    const token = jwt.sign({ email, password }, "secretkey", {
      expiresIn: "354d",
    });
    res.status(200).send({ token });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error logging in.");
  }
});

userRoute.get("/me", authenticateUser, async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found.");
    }
    res.status(200).send(user);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error getting user.");
  }
});

module.exports = userRoute;
