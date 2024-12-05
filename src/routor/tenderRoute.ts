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

tenderRoute.post("/upload/bulk", async (req: Request, res: Response) => {
  try {
    const uniqueTenderEntries = req.body.filter(
      (tender: any, index: number, self: any[]) =>
        index === self.findIndex((t) => t["TenderID"] === tender["TenderID"])
    );

    const bulkOperations = uniqueTenderEntries.map((tender: any) => ({
      updateOne: {
        filter: { TenderId: tender["TenderID"] },
        update: {
          $set: {
            tenderName: tender["TenderName"],
            description: tender["Description"] || "",
            epublishedDate: tender["PublishedDate"],
            refNo: tender["ReferenceNo"],
            district: tender["District"],
            state: tender["State"] || "Tamil Nadu",
            department: tender["Department"],
            subDepartment: tender["Sub-Department-1"] || "",
            location: tender["Location"],
            address: tender["Address"],
            pincode: parseInt(tender["Pincode"]),
            tenderValue: String(tender["TenderValue(₹)"]),
            bidOpeningDate: tender["BidOpeningDate"],
            bidSubmissionDate: tender["BidSubmissionEndDate"],
            industry: tender["Industry"] || "",
            subIndustry: tender["Sub-Industry"] || "",
            classification: tender["Classification"] || "",
            EMDAmountin: tender["EMDAmountin₹"] || "",
            WorkDescription: tender["WorkDescription"] || "",
            source: tender["Source"] || "",
          },
        },
        upsert: true,
      },
    }));

    const result = await Tender.bulkWrite(bulkOperations);

    res.status(201).json({
      message: "Tenders processed successfully.",
      totalReceived: req.body.length,
      totalUnique: uniqueTenderEntries.length,
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
      code: 201,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error processing tenders. Please try again.",
      error: error instanceof Error ? error.message : "Unknown error",
      code: 500,
    });
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
      limit,
      offset,
    } = req.query;

    const filter: any = {};

    if (search) {
      const keywords = (search as string)
        .split(",")
        .map((keyword) => keyword.trim());

      filter.$or = keywords.flatMap((keyword) => [
        { tenderName: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        { refNo: { $regex: keyword, $options: "i" } },
        { department: { $regex: keyword, $options: "i" } },
        { subDepartment: { $regex: keyword, $options: "i" } },
        { location: { $regex: keyword, $options: "i" } },
        { industry: { $regex: keyword, $options: "i" } },
        { subIndustry: { $regex: keyword, $options: "i" } },
        { classification: { $regex: keyword, $options: "i" } },
        { status: { $regex: keyword, $options: "i" } },
        { tenderValue: { $regex: keyword, $options: "i" } },
        { WorkDescription: { $regex: keyword, $options: "i" } },
        { EMDAmountin: { $regex: keyword, $options: "i" } },
        { pinCode: { $regex: keyword, $options: "i" } },
        { TenderId: { $regex: keyword, $options: "i" } },
        { address: { $regex: keyword, $options: "i" } },
      ]);
    }

    if (district) {
      const districtsArray = (district as string).split(",");
      filter.district = { $in: districtsArray.map((d) => new RegExp(d, "i")) };
    }

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

    if (industry) {
      const industryArray = (industry as string).split(",");
      filter.industry = { $in: industryArray.map((i) => new RegExp(i, "i")) };
    }

    if (subIndustry) {
      const subIndustryArray = (subIndustry as string).split(",");
      filter.subIndustry = {
        $in: subIndustryArray.map((si) => new RegExp(si, "i")),
      };
    }

    if (classification) {
      const classificationArray = (classification as string).split(",");
      filter.classification = {
        $in: classificationArray.map((c) => new RegExp(c, "i")),
      };
    }

    if (department) {
      const departmentsArray = (department as string).split(",");
      filter.department = {
        $in: departmentsArray.map((d) => new RegExp(d, "i")),
      };
    }

    if (status) {
      const statusArray = (status as string).split(",");
      filter.status = { $in: statusArray.map((s) => new RegExp(s, "i")) };
    }

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        filter.$or = [{ bidSubmissionDate: { $gte: start, $lte: end } }];
      }
    }
    const query = Tender.find(filter);

    // Only apply pagination if both limit and offset are provided
    if (limit && offset) {
      query.skip(Number(offset)).limit(Number(limit));
    }

    const tenders = await query;
    const count = await Tender.countDocuments(filter);

    res.status(200).json({
      message: "Tenders fetched successfully.",
      result: tenders,
      count,
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
    const industries = await Tender.distinct("industry");

    // Map industries to the desired format
    const formattedIndustries = industries.map((industry, index) => ({
      value: industry.toLowerCase(),
      label: industry,
    }));

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
    const subIndustries = await Tender.distinct("subIndustry");

    const formattedSubIndustries = subIndustries.map((subIndustry, index) => ({
      value: subIndustry.toLowerCase(),
      label: subIndustry,
    }));

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

tenderRoute.delete("/:id", async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const tenders = await Tender.findByIdAndDelete(id);
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
    console.log(tenderId, req.user);
    const userId = req.user.userId || "34234234343434";

    if (!tenderId || !userId) {
      return res
        .status(400)
        .json({ message: "Tender ID and User ID are required." });
    }

    try {
      const tenderMapping = new TenderMapping({ tenderId, userId });
      await tenderMapping.save();
      return res.status(200).json({
        message: "Tender mapping created successfully.",
        result: tenderMapping,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error creating tender mapping.", error });
    }
  }
);

tenderRoute.get("/tender-mapping", async (req: Request, res: Response) => {
  try {
    const mappings = await TenderMapping.find()
      .populate("tenderId")
      .populate("userId")
      .sort({ createdAt: -1 });
    res.status(200).json({ mappings });
  } catch (error) {
    console.log("Error retrieving mappings:", error);

    res.status(500).json({ message: "Error retrieving mappings.", error });
  }
});

tenderRoute.patch(
  "/tender-mapping/:id/note",

  async (req: any, res: Response) => {
    console.log("received");
    const { id } = req.params;
    const { note } = req.body;

    try {
      const tenderMapping = await TenderMapping.findByIdAndUpdate(
        id,
        { note },
        { new: true }
      );

      if (!tenderMapping) {
        return res.status(404).json({ message: "Tender mapping not found" });
      }

      return res.status(200).json({
        message: "Note added successfully",
        result: tenderMapping,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error adding note to tender mapping",
        error,
      });
    }
  }
);

tenderRoute.post("/contact", async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      companyName,
      message,
      type,
      subject,
      remarks,
    } = req.body;
    const contact = new contactModel({
      firstName,
      lastName,
      email,
      companyName,
      message,
      type,
      subject,
      remarks,
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
    const { filter } = req.query;
    const contacts = await contactModel.find({ type: filter });
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

tenderRoute.patch(
  "/contactUpdateRemarks/:id",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { remarks } = req.body;

      const updatedContact = await contactModel.findByIdAndUpdate(id, {
        remarks,
      });
      console.log(remarks, updatedContact);
      if (!updatedContact) {
        return res.status(404).json({
          message: "Contact not found.",
          code: 404,
        });
      }

      res.status(200).json({
        message: "Remarks updated successfully.",
        contact: updatedContact,
        code: 200,
      });
    } catch (error) {
      console.error("Error updating remarks:", error);
      res.status(500).json({
        message: "Error updating remarks. Please try again.",
        error: error.message,
        code: 500,
      });
    }
  }
);

tenderRoute.delete(
  "/contactDelete/:id",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      // Find and delete the contact by ID
      const deletedContact = await contactModel.findByIdAndDelete(id);

      if (!deletedContact) {
        return res.status(404).json({
          message: "Contact not found.",
          code: 404,
        });
      }

      res.status(200).json({
        message: "Contact deleted successfully.",
        contact: deletedContact,
        code: 200,
      });
    } catch (error) {
      console.error("Error deleting contact:", error);
      res.status(500).json({
        message: "Error deleting contact. Please try again.",
        error: error.message,
        code: 500,
      });
    }
  }
);

tenderRoute.patch(
  "/contactMarkAsContacted/:id",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Find the contact and update its type to "contacted"
      const updatedContact = await contactModel.findByIdAndUpdate(
        id,
        { type: "contacted" },
        { new: true } // Return the updated document
      );

      if (!updatedContact) {
        return res.status(404).json({
          message: "Contact not found.",
          code: 404,
        });
      }

      res.status(200).json({
        message: "Contact marked as contacted successfully.",
        contact: updatedContact,
        code: 200,
      });
    } catch (error) {
      console.error("Error marking contact as contacted:", error);
      res.status(500).json({
        message: "Error marking contact as contacted. Please try again.",
        error: error.message,
        code: 500,
      });
    }
  }
);

module.exports = tenderRoute;
