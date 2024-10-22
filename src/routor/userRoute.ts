const express = require("express");
const userRoute = express.Router();
import bcrypt from "bcryptjs";
import { NextFunction, Request, Response } from "express";
const User = require("../model/user.model");
import jwt from "jsonwebtoken";
import { Otp_template } from "../templete/otpTemplate";
import bannerModel from "../model/banner.model";
const { transporter } = require("../nodemailer");
const authenticateUser = (req: any, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1]; // Get token from header

  if (!token) {
    return res.status(401).json({ message: "No token provided." });
  }

  try {
    const decoded = jwt.verify(token, "secretkey"); // Verify token
    console.log(decoded, "decoded");
    req.user = { userId: (decoded as { userId: string }).userId }; // Attach userId to req.user
    next(); // Proceed to next middleware or route handler
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).json({ message: "Invalid token." });
  }
};

userRoute.post("/create/account", async (req: any, res: any) => {
  try {
    const {
      phone,
      email,
      password,
      name,
      companyName,
      isGoogleAuth,
      profile_image,
    } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if the email or phone number already exists
    const existingUser = await User.findOne({
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
    });

    await newUser.save();

    // Generate JWT token for the newly created user
    const token = jwt.sign({ userId: newUser._id }, "secretkey", {
      expiresIn: "354d",
    });

    res.status(201).json({
      message: "User registered successfully.",
      accessToken: token,
      subscriptionValidity, // Return the subscription validity to the user
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error registering user.");
  }
});

userRoute.post("/create/account/google", async (req: any, res: any) => {
  try {
    const { email, name, picture, isGoogleAuth } = req.body; // Extract user info from the token

    // Check if the user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      // If user exists, generate a JWT token
      const token = jwt.sign({ userId: existingUser._id }, "secretkey", {
        expiresIn: "354d",
      });

      return res.status(200).json({
        message: "User already exists.",
        accessToken: token,
        subscriptionValidity: existingUser.subscriptionValidity, // Return existing subscription validity
      });
    }

    // Create a new user
    const newUser = new User({
      email,
      name,
      profile_image: picture,
      phone: "",
      // Add any default fields needed for the new user
      subscriptionValidity: new Date(
        new Date().setDate(new Date().getDate() + 3)
      ), // Default 3-day subscription validity
      isGoogleAuth: true, // Indicate that this is a Google-authenticated user
      password: "google", // Set a default password for Google-authenticated users
    });

    await newUser.save();

    // Generate a JWT token for the newly created user
    const token = jwt.sign({ userId: newUser._id }, "secretkey", {
      expiresIn: "354d",
    });

    res.status(201).json({
      message: "User registered successfully.",
      accessToken: token,
      subscriptionValidity: newUser.subscriptionValidity, // Return subscription validity
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error registering user with Google.");
  }
});

userRoute.post(
  "/success/payment",
  authenticateUser,
  async (req: any, res: any) => {
    const { paymentId, amount, duration } = req.body;
    const userId = req.user.userId;

    try {
      // Find the user and update payment status
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let validityDuration;
      if (duration === "Per Month") {
        validityDuration = 30;
      } else if (duration === "Per Half Year") {
        validityDuration = 182;
      } else if (duration === "Per Year") {
        validityDuration = 365;
      } else {
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
      subscriptionValidity.setDate(
        subscriptionValidity.getDate() + validityDuration
      );

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

      await user.save();

      res.status(200).json({
        message: "Payment successful",
        subscriptionValidity,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "An error occurred", error });
    }
  }
);

// forgot password
userRoute.post("/forgot/password", async (req: Request, res: Response) => {
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

    const user: any = await User.findOne({ email });
    if (!user) {
      return res.status(404).send("User not found.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();
    res.status(200).send({
      message: "Password changed successfully.",
      code: 200,
      newPassword: password,
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

// Utility function to add days to a date
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

userRoute.get("/status", authenticateUser, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    const user: any | null = await User.findById(userId);
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error getting user status." });
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

    const isGoogleAuth = user.isGoogleAuth;

    if (user.status === "Inactive") {
      return res.status(200).json({
        message: "Your account has been deactivated. Please contact support.",
        code: 401,
      });
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

userRoute.post("/google/login", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        message: "User not found.",
        code: 404,
      });
    }

    // Assuming you may want to add more checks or handle user creation here
    const token = jwt.sign({ userId: user._id }, "secretkey"); // Use a consistent secret key

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

userRoute.post(
  "/suggestion",
  authenticateUser,
  async (req: any, res: Response) => {
    try {
      const { classification, industry, state } = req.body;

      if (!classification || !industry || !state) {
        return res.status(400).send("All fields are required.");
      }

      const userId = req.user.userId;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).send("User not found.");
      }

      user.classification = classification;
      user.industry = industry;
      user.state = state;

      await user.save();

      res.status(200).send({
        message: "User details updated successfully.",
        user,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Error getting user.");
    }
  }
);

// check user already added suggestion or not
userRoute.get(
  "/suggestion/check",
  authenticateUser,
  async (req: any, res: Response) => {
    try {
      const userId = req.user.userId;
      const user = await User.findById(userId);

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
      } else {
        return res.status(200).send({
          message: "User has not added any suggestions yet.",
        });
      }
    } catch (error) {
      console.error(error);
      res.status(500).send("Error checking user suggestions.");
    }
  }
);

userRoute.get("/users", async (req: Request, res: Response) => {
  try {
    const users = await User.find();
    res.status(200).send(users);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error getting users.");
  }
});

// delete user with id /users/:id
userRoute.delete("/users/:id", async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found.", code: 404 });
    }
    res.status(200).json({
      message: "User deleted successfully.",
      code: 200,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error deleting user.");
  }
});

// update user status with id /users/:id/status
userRoute.patch("/users/:id/status", async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found.", code: 404 });
    }
    console.log(req.body.status, user, "req.body.status");

    user.status = req.body.status;
    await user.save();
    res.status(200).json({
      message: "User status updated successfully.",
      code: 200,
      status: user.status,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error updating user status.");
  }
});

userRoute.post("/banner", async (req: Request, res: Response) => {
  try {
    const { banner, isSignup, isActive } = req.body;

    // Validation: Ensure the 'banner' field exists and is not empty
    if (!banner || typeof banner !== "string" || banner.trim() === "") {
      return res.status(400).send({ error: "Invalid banner data." });
    }

    // Check if a banner already exists (assuming you only ever have one banner)
    const existingBanner: any = await bannerModel.findOne();

    if (existingBanner) {
      // If a banner already exists, update it
      existingBanner.banner = banner;
      existingBanner.isSignup = isSignup;
      existingBanner.isActive = isActive;

      await existingBanner.save();
      return res.status(200).send({
        message: "Banner updated successfully.",
        banner: existingBanner,
      });
    } else {
      // If no banner exists, create a new one
      const newBanner = await bannerModel.create({
        banner,
        isSignup,
        isActive,
      });
      return res
        .status(201)
        .send({ message: "Banner created successfully.", banner: newBanner });
    }
  } catch (error) {
    console.error("Error processing banner request:", error);
    return res.status(500).send({ error: "Error adding/updating banner." });
  }
});

userRoute.get("/banner", async (req: Request, res: Response) => {
  try {
    const banner = await bannerModel.findOne();
    return res.status(200).send({ banner });
  } catch (error) {
    console.error("Error fetching banner:", error);
    return res.status(500).send({ error: "Error fetching banner." });
  }
});

module.exports = userRoute;
