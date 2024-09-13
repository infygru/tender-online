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

      // Split tenderValue into an array if it's a comma-separated string
      const tenderValueArray = (tenderValue as string).split(",");

      // Create an array to hold the range filters
      const tenderValueFilters: any[] = [];

      tenderValueArray.forEach((value) => {
        // Find the corresponding tender value range from TenderValue
        const selectedValue = TenderValue.find((item) => item.value === value);

        if (selectedValue) {
          const rangeFilter: any = {};
          if (selectedValue.minValue !== undefined) {
            rangeFilter.$gte = selectedValue.minValue;
          }
          if (selectedValue.maxValue !== undefined) {
            rangeFilter.$lte = selectedValue.maxValue;
          }

          // If a valid range filter is constructed, add it to the filters array
          if (Object.keys(rangeFilter).length > 0) {
            tenderValueFilters.push({ tenderValue: rangeFilter });
          }
        }
      });

      console.log(tenderValueFilters, "tenderValueFilters");

      // Apply $or operator if there are multiple ranges selected
      if (tenderValueFilters.length > 0) {
        filter.$or = tenderValueFilters;
      }
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
