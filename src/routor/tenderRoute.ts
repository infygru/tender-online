import { NextFunction, Request, Response } from "express";
import Tender from "../model/tender.model";
import TenderMapping from "../model/tender.mapping.model";
const express = require("express");
const tenderRoute = express.Router();
import jwt from "jsonwebtoken";
import contactModel from "../model/contact.model";
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
      const randomNumber = generateRandomNumber(1, 999);
      TenderId = `TENDER${randomNumber}`;

      // Use atomic operation to check if TenderId exists and create the tender if unique
      const result: any = await Tender.findOneAndUpdate(
        { TenderId }, // Check if this TenderId exists
        { $setOnInsert: { ...req.body, TenderId } }, // Insert if it doesn't exist
        { upsert: true, new: true, rawResult: true } // Upsert and return the new document
      );

      if (result.lastErrorObject.updatedExisting === false) {
        // If a new document was created, we found a unique TenderId
        isUnique = true;
        res.status(201).json({
          message: "Tender created successfully.",
          result: result.value,
          code: 201,
        });
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating tender. Please try again.");
  }
});
// Authentication middleware for all API routes
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
      industry: tender["Industry"] || "",
      subIndustry: tender["Sub-Industry"] || "",
      classification: tender["Classification"] || "",
      EMDAmountin: tender["EMDAmountin₹"] || "",
      WorkDescription: tender["WorkDescription"] || "",
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
    const {
      search,
      district,
      tenderValue,
      department,
      status,
      industry,
      subIndustry,
      classification,
      startDate,
      endDate,
    } = req.query;

    // Construct the search filter
    const filter: any = {};

    // Global search filter (searches in multiple fields)
    if (search) {
      filter.$or = [
        { tenderName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { refNo: { $regex: search, $options: "i" } },
      ];
    }

    // District filter (supports multiple values)
    if (district) {
      const districtsArray = (district as string).split(",");
      filter.district = { $in: districtsArray.map((d) => new RegExp(d, "i")) };
    }

    // Tender Value filter (supports multiple values)
    if (tenderValue) {
      const TenderValue = [
        { value: "1", label: "Less than ₹10L", minValue: 0, maxValue: 1000000 },
        {
          value: "2",
          label: "₹10L - ₹1Cr",
          minValue: 1000000,
          maxValue: 10000000,
        },
        {
          value: "3",
          label: "₹1Cr - ₹100Cr",
          minValue: 10000000,
          maxValue: 1000000000,
        },
        { value: "4", label: "More than ₹100Cr", minValue: 1000000000 },
      ];

      const tenderValueArray = (tenderValue as string).split(",");
      const tenderValueFilters: any[] = [];

      tenderValueArray.forEach((value) => {
        const selectedValue = TenderValue.find((item) => item.value === value);
        if (selectedValue) {
          const rangeFilter: any = {};
          if (selectedValue.minValue !== undefined)
            rangeFilter.$gte = selectedValue.minValue;
          if (selectedValue.maxValue !== undefined)
            rangeFilter.$lte = selectedValue.maxValue;
          if (Object.keys(rangeFilter).length > 0)
            tenderValueFilters.push({ tenderValue: rangeFilter });
        }
      });

      if (tenderValueFilters.length > 0) filter.$or = tenderValueFilters;
    }

    // Industry filter (supports multiple values)
    if (industry) {
      const industryArray = (industry as string).split(",");
      filter.industry = { $in: industryArray.map((i) => new RegExp(i, "i")) };
    }

    // SubIndustry filter (supports multiple values)
    if (subIndustry) {
      const subIndustryArray = (subIndustry as string).split(",");
      filter.subIndustry = {
        $in: subIndustryArray.map((si) => new RegExp(si, "i")),
      };
    }

    // Classification filter (supports multiple values)
    if (classification) {
      const classificationArray = (classification as string).split(",");
      filter.classification = {
        $in: classificationArray.map((c) => new RegExp(c, "i")),
      };
    }

    // Department filter (supports multiple values)
    if (department) {
      const departmentsArray = (department as string).split(",");
      filter.department = {
        $in: departmentsArray.map((d) => new RegExp(d, "i")),
      };
    }

    // Status filter (supports multiple values)
    if (status) {
      const statusArray = (status as string).split(",");
      filter.status = { $in: statusArray.map((s) => new RegExp(s, "i")) };
    }

    // Date Range Filter (Bid Opening and Submission Dates)
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      // Ensure start and end dates are valid
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        filter.$or = [
          // { bidOpeningDate: { $gte: start, $lte: end } },
          { bidSubmissionDate: { $gte: start, $lte: end } },
        ];
      }
    }

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

tenderRoute.get("/industries", async (req: Request, res: Response) => {
  try {
    // Fetch all unique industries from the tenders collection
    const industries = await Tender.distinct("industry");

    // Map industries to the desired format
    const formattedIndustries = industries.map((industry, index) => ({
      value: industry.toLowerCase(), // Assign an incrementing value
      label: industry, // Use the industry name as the label
    }));

    // Return the formatted industries in the response
    res.status(200).json({
      message: "Industries fetched successfully.",
      industries: formattedIndustries,
      code: 200,
    });
  } catch (error) {
    console.error("Error fetching industries:", error);
    res.status(500).json({
      message: "Error fetching industries. Please try again.",
      error: error.message,
    });
  }
});

tenderRoute.get("/sub-industries", async (req: Request, res: Response) => {
  try {
    // Fetch all unique sub-industries from the tenders collection
    const subIndustries = await Tender.distinct("subIndustry");

    // Map sub-industries to the desired format
    const formattedSubIndustries = subIndustries.map((subIndustry, index) => ({
      value: subIndustry.toLowerCase(), // Assign an incrementing value
      label: subIndustry, // Use the sub-industry name as the label
    }));

    // Return the formatted sub-industries in the response
    res.status(200).json({
      message: "Sub-industries fetched successfully.",
      subIndustries: formattedSubIndustries,
      code: 200,
    });
  } catch (error) {
    console.error("Error fetching sub-industries:", error);
    res.status(500).json({
      message: "Error fetching sub-industries. Please try again.",
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

tenderRoute.post(
  "/tender-mapping",
  authenticateUser,
  async (req: any, res: Response) => {
    const { tenderId } = req.body;

    const userId = req.user.userId || "34234234343434";

    if (!tenderId || !userId) {
      return res
        .status(400)
        .json({ message: "Tender ID and User ID are required." });
    }

    try {
      const tenderMapping = new TenderMapping({ tenderId, userId });
      await tenderMapping.save();
      res.status(201).json({
        message: "Tender mapping created successfully.",
        result: tenderMapping,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error creating tender mapping.", error });
    }
  }
);

// GET method to retrieve all users for a particular tender
tenderRoute.get("/tender-mapping", async (req: Request, res: Response) => {
  try {
    const mappings = await TenderMapping.find({}).populate("tenderId userId");
    res.status(200).json({ mappings });
  } catch (error) {
    console.log("Error retrieving mappings:", error);

    res.status(500).json({ message: "Error retrieving mappings.", error });
  }
});

tenderRoute.post("/contact", async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, companyName, message } = req.body;
    const contact = new contactModel({
      firstName,
      lastName,
      email,
      companyName,
      message,
    });

    await contact.save();
    res.status(201).json({
      message: "Contact form submitted successfully.",
      code: 201,
      contact,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error submitting contact form. Please try again.");
  }
});

tenderRoute.get("/contact", async (req: Request, res: Response) => {
  try {
    const contacts = await contactModel.find({});
    res.status(200).json({
      message: "Contacts fetched successfully.",
      contacts,
      code: 200,
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({
      message: "Error fetching contacts. Please try again.",
      error: error.message,
    });
  }
});

module.exports = tenderRoute;
