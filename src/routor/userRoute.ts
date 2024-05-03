const express = require("express");
const userRoute = express.Router();
import bcrypt from "bcryptjs";
import { Request, Response } from "express";
const User = require("../model/user.model");
import jwt from "jsonwebtoken";

userRoute.post("/create/account", async (req: Request, res: Response) => {
  try {
    const {
      phone,
      email,
      msmeNo,
      password,
      subscriptionPackage,
      name,
      username,
      gstNo,
    } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

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

module.exports = userRoute;
