import { Request, Response } from "express";
import Tender from "../model/tender.model";
const express = require("express");
const tenderRoute = express.Router();

const generateRandomNumber = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

tenderRoute.post("/create", async (req: Request, res: Response) => {
  try {
    let TenderId;
    let isUnique = false;

    // Generate a unique TenderId
    while (!isUnique) {
      // Generate random number between 100 and 999 (to get three digits)
      const randomNumber = generateRandomNumber(100, 999);
      TenderId = `TENDER${randomNumber}`;

      // Check if TenderId already exists in the database
      const existingTender = await Tender.findOne({ TenderId });
      if (!existingTender) {
        isUnique = true;
      }
    }

    const newTender = new Tender({
      ...req.body,
      TenderId,
    });

    await newTender.save();
    res.status(201).json({
      message: "Tender created successfully.",
      result: newTender,
      code: 201,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating tender. please try again.");
  }
});

tenderRoute.post("/upload/bulk", async (req: Request, res: Response) => {
  try {
    const tenders = req.body.map((tender: any) => ({
      // Map keys to match Mongoose model and convert date strings to Date objects
      epublishedDate: new Date(tender["e-Published Date"]),
      closeingDate: new Date(tender["Closing Date"]),
      openingDate: new Date(tender["Opening Date"]),
      refNo: tender["Ref.No"],
      TenderId: tender["Tender ID"],
      title: tender["Title "],
      organizationChain: tender["Organisation Chain"],
      AraeSpecification1: tender["Area Specificity 1"],
      AraeSpecification2: tender["Area Specificity 2"],
      AraeSpecification3: tender["Area Specificity 3"],
    }));

    const result = await Tender.insertMany(tenders);
    res.status(201).json({
      message: "Tenders uploaded successfully.",
      result,
      code: 201,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error uploading tenders. Please try again.");
  }
});

tenderRoute.get("/all", async (req: Request, res: Response) => {
  try {
    const tenders = await Tender.find();
    res.status(200).json({
      message: "Tenders fetched successfully.",
      result: tenders,
      code: 200,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching tenders. Please try again.");
  }
});

tenderRoute.delete("/delete/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tender = await Tender.findByIdAndDelete(id);

    if (!tender) {
      return res.status(404).send("Tender not found.");
    }

    res.status(200).json({
      message: "Tender deleted successfully.",
      result: tender,
      code: 200,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error deleting tender. Please try again.");
  }
});

module.exports = tenderRoute;
