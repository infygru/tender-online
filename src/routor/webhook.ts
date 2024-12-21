import crypto from "crypto";
import Razorpay from "razorpay";
import cron from "node-cron";
import express from "express";
const User = require("../model/user.model");
require("dotenv").config();

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZOR_API_KEY,
  key_secret: process.env.NEXT_PUBLIC_RAZOR_API_SECRET,
});

const validateWebhookSignature = (req: any, res: any, next: any) => {
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

const updateUserSubscriptionStatus = async (
  user: any,
  subscription: any,
  status: any
) => {
  user.paymentStatus = status;
  console.info("Updated User Status", status);
  await user.save();
};

const handleSubscriptionCharged = async (subscription: any) => {
  try {
    if (!subscription?.id) {
      return console.log("Invalid subscription ID");
    }

    const user = await User.findOne({
      currentSubscriptionId: subscription.id,
    });

    if (!user) {
      return console.log(
        `User not found for subscription ID: ${subscription.id}`
      );
    }

    const duration = subscription.notes?.duration;
    if (!duration) {
      return console.log("Duration not found in subscription notes");
    }

    let paymentAmount: any;
    try {
      const invoices = await razorpay.invoices.all({
        subscription_id: subscription.id,
        count: 1,
      });

      if (!invoices || !invoices.items || invoices.items.length === 0) {
        return console.log("No invoice found for subscription");
      }

      const latestInvoice = invoices.items[0];
      paymentAmount = latestInvoice.amount;

      if (!paymentAmount || isNaN(paymentAmount)) {
        return console.log(
          `Invalid payment amount from invoice: ${paymentAmount}`
        );
      }
    } catch (error) {
      console.error("Error fetching invoice:", error);
      return console.log(`Failed to fetch payment details: ${error.message}`);
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
        return console.log(`Invalid duration: ${duration}`);
    }

    const newValidity = new Date();
    if (user.subscriptionValidity && user.subscriptionValidity > new Date()) {
      newValidity.setTime(user.subscriptionValidity.getTime());
    }
    newValidity.setDate(newValidity.getDate() + validityDuration);

    let remaining_count = false;
    if (subscription.remaining_count === 0) remaining_count = true;

    const subscriptionEntry = {
      subscriptionId: subscription.id,
      planId: subscription.plan_id,
      amount: amountInRupees,
      duration: duration,
      subscriptionDate: new Date(subscription.created_at * 1000),
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
          paymentStatus: remaining_count ? "Completed" : subscription.status,
          isPayment: true,
          status: "active",
        },
        $push: { subscriptionHistory: subscriptionEntry },
      },
      { new: true, runValidators: true }
    );

    if (!updateResult) {
      return console.log("Failed to update user subscription");
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

const handleSubscriptionPending = async (subscription: any) => {
  try {
    const user = await User.findOne({
      currentSubscriptionId: subscription.id,
    });

    if (!user) {
      return console.log("User not found for subscription");
    }

    await updateUserSubscriptionStatus(user, subscription, subscription.status);
  } catch (error) {
    console.error("Error processing pending subscription:", error);
  }
};

const handleSubscriptionHalted = async (subscription: any) => {
  try {
    const user = await User.findOne({
      currentSubscriptionId: subscription.id,
    });

    if (!user) {
      return console.log("User not found for subscription");
    }

    await updateUserSubscriptionStatus(user, subscription, subscription.status);
  } catch (error) {
    console.error("Error processing halted subscription:", error);
  }
};

const handleSubscriptionCancelled = async (subscription: any) => {
  try {
    const user = await User.findOne({
      currentSubscriptionId: subscription.id,
    });

    if (!user) {
      return console.log("User not found for subscription");
    }

    await updateUserSubscriptionStatus(user, subscription, subscription.status);
  } catch (error) {
    console.error("Error processing cancelled subscription:", error);
  }
};

const handleSubscriptionCompleted = async (subscription: any) => {
  try {
    const user = await User.findOne({
      currentSubscriptionId: subscription.id,
    });

    if (!user) {
      return console.log("User not found for subscription");
    }

    await updateUserSubscriptionStatus(user, subscription, subscription.status);
  } catch (error) {
    console.error("Error processing cancelled subscription:", error);
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
      }
    }
  } catch (error) {
    console.error("Error in subscription check cron:", error);
  }
};

const handleSubscriptionWebhook = async (req: any, res: any) => {
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

      case "subscription.completed":
        await handleSubscriptionCompleted(event.payload.subscription.entity);
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

webhook.post("/cancel-subscription", async (req, res) => {
  const { subscriptionId } = await req.body;
  try {
    console.log(subscriptionId);
    const razorRes = await razorpay.subscriptions.cancel(subscriptionId);
  } catch (error) {
    console.error(error);
  }
  return res.json(subscriptionId);
});
cron.schedule("0 0 * * *", checkExpiringSubscriptions);

module.exports = webhook;
