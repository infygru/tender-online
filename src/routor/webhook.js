const crypto = require("crypto");
const Razorpay = require("razorpay");
const cron = require("node-cron");
const express = require("express");
const User = require("../model/user.model");
require("dotenv").config();

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZOR_API_KEY,
  key_secret: process.env.NEXT_PUBLIC_RAZOR_API_SECRET,
});

const validateWebhookSignature = (req, res, next) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers["x-razorpay-signature"];

  const shasum = crypto.createHmac("sha256", webhookSecret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest("hex");

  if (signature === digest) {
    next();
  } else {
    res.status(400).json({ error: "Invalid webhook signature" });
  }
};

const updateUserSubscriptionStatus = async (user, subscription, status) => {
  user.paymentStatus = status;
  user.isPayment = status === "Completed";

  if (status === "Completed") {
    user.status = "active";
  } else if (status === "Failed" || status === "Cancelled") {
    user.status = "inactive";
  }

  await user.save();
};

const handleSubscriptionCharged = async (subscription) => {
  try {
    if (!subscription?.id) {
      throw new Error("Invalid subscription ID");
    }

    const user = await User.findOne({
      currentSubscriptionId: subscription.id,
    });

    if (!user) {
      throw new Error(`User not found for subscription ID: ${subscription.id}`);
    }

    const duration = subscription.notes?.duration;
    if (!duration) {
      throw new Error("Duration not found in subscription notes");
    }

    let paymentAmount;
    try {
      const invoices = await razorpay.invoices.all({
        subscription_id: subscription.id,
        count: 1,
      });

      if (!invoices || !invoices.items || invoices.items.length === 0) {
        throw new Error("No invoice found for subscription");
      }

      const latestInvoice = invoices.items[0];
      paymentAmount = latestInvoice.amount;

      if (!paymentAmount || isNaN(paymentAmount)) {
        throw new Error(
          `Invalid payment amount from invoice: ${paymentAmount}`
        );
      }
    } catch (error) {
      console.error("Error fetching invoice:", error);
      throw new Error(`Failed to fetch payment details: ${error.message}`);
    }

    const amountInRupees = Math.round((paymentAmount / 100) * 100) / 100;

    let validityDuration;
    switch (duration) {
      case "Per Month":
        validityDuration = 30;
        break;
      case "Per Half Year":
        validityDuration = 182;
        break;
      case "Per Year":
        validityDuration = 365;
        break;
      default:
        throw new Error(`Invalid duration: ${duration}`);
    }

    const newValidity = new Date();
    if (user.subscriptionValidity && user.subscriptionValidity > new Date()) {
      newValidity.setTime(user.subscriptionValidity.getTime());
    }
    newValidity.setDate(newValidity.getDate() + validityDuration);

    const subscriptionEntry = {
      subscriptionId: subscription.id,
      planId: subscription.plan_id,
      amount: amountInRupees,
      duration: duration,
      subscriptionDate: new Date(subscription.created_at * 1000), // Convert UNIX timestamp to Date
      validUntil: newValidity,
    };

    const updateResult = await User.findOneAndUpdate(
      { _id: user._id },
      {
        $set: {
          subscriptionValidity: newValidity,
          lastSubscriptionDate: new Date(),
          subscriptionAmount: amountInRupees,
          currentSubscriptionPlanId: subscription.plan_id,
          paymentStatus: "Completed",
          isPayment: true,
          status: "active",
        },
        $push: { subscriptionHistory: subscriptionEntry },
      },
      { new: true, runValidators: true }
    );

    if (!updateResult) {
      throw new Error("Failed to update user subscription");
    }

    console.log(`Successfully processed subscription for user ${user._id}`, {
      subscriptionId: subscription.id,
      amount: amountInRupees,
      duration: duration,
      validUntil: newValidity,
    });

    return updateResult;
  } catch (error) {
    console.error("Subscription processing error:", {
      error: error.message,
      subscriptionId: subscription?.id,
      stack: error.stack,
    });
    throw error;
  }
};

const handleSubscriptionPending = async (subscription) => {
  try {
    const user = await User.findOne({
      currentSubscriptionId: subscription.id,
    });

    if (!user) {
      throw new Error("User not found for subscription");
    }

    await updateUserSubscriptionStatus(user, subscription, "Pending");
  } catch (error) {
    console.error("Error processing pending subscription:", error);
    await logError("subscription_pending_processing", error);
  }
};

const handleSubscriptionHalted = async (subscription) => {
  try {
    const user = await User.findOne({
      currentSubscriptionId: subscription.id,
    });

    if (!user) {
      throw new Error("User not found for subscription");
    }

    await updateUserSubscriptionStatus(user, subscription, "Failed");
  } catch (error) {
    console.error("Error processing halted subscription:", error);
    await logError("subscription_halted_processing", error);
  }
};

const handleSubscriptionCancelled = async (subscription) => {
  try {
    const user = await User.findOne({
      currentSubscriptionId: subscription.id,
    });

    if (!user) {
      throw new Error("User not found for subscription");
    }

    await updateUserSubscriptionStatus(user, subscription, "Cancelled");
  } catch (error) {
    console.error("Error processing cancelled subscription:", error);
    await logError("subscription_cancelled_processing", error);
  }
};

const checkExpiringSubscriptions = async () => {
  try {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 3);

    const users = await User.find({
      isPayment: true,
      subscriptionValidity: {
        $gte: new Date(),
        $lte: expiryDate,
      },
    });

    for (const user of users) {
      try {
        const subscription = await razorpay.subscriptions.fetch(
          user.currentSubscriptionId
        );

        switch (subscription.status) {
          case "active":
            break;

          case "halted":
          case "cancelled":
            await updateUserSubscriptionStatus(user, subscription, "Failed");
            break;
        }
      } catch (error) {
        console.error(
          `Error checking subscription for user ${user._id}:`,
          error
        );
        await logError("subscription_check", error);
      }
    }
  } catch (error) {
    console.error("Error in subscription check cron:", error);
    await logError("subscription_check_cron", error);
  }
};

const handleSubscriptionWebhook = async (req, res) => {
  const event = req.body;
  console.log(event.event);
  try {
    switch (event.event) {
      case "subscription.charged":
        await handleSubscriptionCharged(event.payload.subscription.entity);
        break;

      case "subscription.pending":
        await handleSubscriptionPending(event.payload.subscription.entity);
        break;

      case "subscription.halted":
        await handleSubscriptionHalted(event.payload.subscription.entity);
        break;

      case "subscription.cancelled":
        await handleSubscriptionCancelled(event.payload.subscription.entity);
        break;
    }

    res.json({ status: "success" });
  } catch (error) {
    console.error("Webhook handling error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};

const webhook = express.Router();

webhook.post(
  "/razorpay-webhook",
  validateWebhookSignature,
  handleSubscriptionWebhook
);

cron.schedule("0 0 * * *", checkExpiringSubscriptions);

module.exports = webhook;
