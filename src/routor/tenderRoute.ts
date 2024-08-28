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

// Convert Excel date number to JavaScript Date
const excelDateToFormattedDate = (excelDate: number): string => {
  if (isNaN(excelDate) || excelDate < 0) {
    return "refer document";
  }

  const epoch = new Date(1899, 11, 30); // Excel's epoch date
  const date = new Date(epoch.getTime() + (excelDate - 1) * 86400000); // Convert days to milliseconds

  const day = date.getUTCDate().toString().padStart(2, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0"); // Months are zero-based
  const year = date.getUTCFullYear();

  return `${day}/${month}/${year}`;
};

tenderRoute.post("/upload/bulk", async (req: Request, res: Response) => {
  try {
    console.log("Request body:", req.body);

    const tenders = req.body.map((tender: any) => ({
      tenderName: tender["TenderName"],
      description: tender["Description"] || "",
      epublishedDate: tender["PublishedDate"],
      refNo: tender["ReferenceNo"],
      TenderId: tender["TenderID"],
      district: tender["District"],
      state: tender["State"] || "Tamil Nadu",
      department: tender["Department"],
      subDepartment: tender["Sub-Department-1"] || "",
      location: tender["Location"],
      address: tender["Address"],
      pincode: parseInt(tender["Pincode"]),
      tenderValue: parseFloat(tender["TenderValue(₹)"]),
      bidOpeningDate: tender["BidOpeningDate"],
      bidSubmissionDate: tender["BidSubmissionEndDate"],
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
    const { search, district, tenderValue, department, status } = req.query;

    // Construct the search filter
    const filter: any = {};

    // Global search filter (searches in multiple fields)
    if (search) {
      filter.$or = [
        { tenderName: { $regex: search, $options: "i" } }, // Case-insensitive search
        { description: { $regex: search, $options: "i" } },
        { refNo: { $regex: search, $options: "i" } },
      ];
    }

    // Specific filters
    if (district) {
      filter.district = { $regex: district, $options: "i" };
    }

    if (tenderValue) {
      filter.tenderValue = tenderValue;
    }

    if (department) {
      filter.department = { $regex: department, $options: "i" };
    }

    if (status) {
      filter.status = { $regex: status, $options: "i" };
    }

    console.log("Filter:", JSON.stringify(filter, null, 2)); // Log filter for debugging
    // Fetch filtered tenders from MongoDB
    const tenders = await Tender.find(filter);

    res.status(200).json({
      message: "Tenders fetched successfully.",
      result: tenders,
      code: 200,
    });
  } catch (error) {
    console.error("Error fetching tenders:", error);
    res.status(500).json({
      message: "Error fetching tenders. Please try again.",
      error: error.message,
    });
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

// delete all data
tenderRoute.delete("/delete", async (req: Request, res: Response) => {
  try {
    const tenders = await Tender.deleteMany({});
    res.status(200).json({
      message: "All tenders deleted successfully.",
      result: tenders,
      code: 200,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error deleting tenders. Please try again.");
  }
});

module.exports = tenderRoute;
