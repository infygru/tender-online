"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tender_model_1 = __importDefault(require("../model/tender.model"));
const tender_mapping_model_1 = __importDefault(require("../model/tender.mapping.model"));
const express = require("express");
const tenderRoute = express.Router();
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const contact_model_1 = __importDefault(require("../model/contact.model"));
const generateRandomNumber = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
};
tenderRoute.post("/create", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let TenderId;
        let isUnique = false;
        // Generate a unique TenderId
        while (!isUnique) {
            // Generate random number between 100 and 999 (to get three digits)
            const randomNumber = generateRandomNumber(1, 999);
            TenderId = `TENDER${randomNumber}`;
            // Use atomic operation to check if TenderId exists and create the tender if unique
            const result = yield tender_model_1.default.findOneAndUpdate({ TenderId }, // Check if this TenderId exists
            { $setOnInsert: Object.assign(Object.assign({}, req.body), { TenderId }) }, // Insert if it doesn't exist
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
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error creating tender. Please try again.");
    }
}));
// Authentication middleware for all API routes
const authenticateUser = (req, res, next) => {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1]; // Get token from header
    if (!token) {
        return res.status(401).json({ message: "No token provided." });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, "secretkey"); // Verify token
        req.user = { userId: decoded.userId }; // Attach userId to req.user
        next(); // Proceed to next middleware or route handler
    }
    catch (error) {
        console.error("Token verification failed:", error);
        return res.status(401).json({ message: "Invalid token." });
    }
};
tenderRoute.post("/upload/bulk", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uniqueTenderEntries = req.body.filter((tender, index, self) => index === self.findIndex((t) => t["TenderID"] === tender["TenderID"]));
        const bulkOperations = uniqueTenderEntries.map((tender) => ({
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
                    },
                },
                upsert: true,
            },
        }));
        const result = yield tender_model_1.default.bulkWrite(bulkOperations);
        res.status(201).json({
            message: "Tenders processed successfully.",
            totalReceived: req.body.length,
            totalUnique: uniqueTenderEntries.length,
            upserted: result.upsertedCount,
            modified: result.modifiedCount,
            code: 201,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Error processing tenders. Please try again.",
            error: error instanceof Error ? error.message : "Unknown error",
            code: 500,
        });
    }
}));
tenderRoute.get("/all", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { search, district, tenderValue, department, status, industry, subIndustry, classification, startDate, endDate, } = req.query;
        const filter = {};
        if (search) {
            const keywords = search
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
            const districtsArray = district.split(",");
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
            const tenderValueArray = tenderValue.split(",");
            const tenderValueFilters = [];
            tenderValueArray.forEach((value) => {
                const selectedValue = TenderValue.find((item) => item.value === value);
                if (selectedValue) {
                    const rangeFilter = {};
                    if (selectedValue.minValue !== undefined)
                        rangeFilter.$gte = selectedValue.minValue;
                    if (selectedValue.maxValue !== undefined)
                        rangeFilter.$lte = selectedValue.maxValue;
                    if (Object.keys(rangeFilter).length > 0)
                        tenderValueFilters.push({ tenderValue: rangeFilter });
                }
            });
            if (tenderValueFilters.length > 0)
                filter.$or = tenderValueFilters;
        }
        if (industry) {
            const industryArray = industry.split(",");
            filter.industry = { $in: industryArray.map((i) => new RegExp(i, "i")) };
        }
        if (subIndustry) {
            const subIndustryArray = subIndustry.split(",");
            filter.subIndustry = {
                $in: subIndustryArray.map((si) => new RegExp(si, "i")),
            };
        }
        if (classification) {
            const classificationArray = classification.split(",");
            filter.classification = {
                $in: classificationArray.map((c) => new RegExp(c, "i")),
            };
        }
        if (department) {
            const departmentsArray = department.split(",");
            filter.department = {
                $in: departmentsArray.map((d) => new RegExp(d, "i")),
            };
        }
        if (status) {
            const statusArray = status.split(",");
            filter.status = { $in: statusArray.map((s) => new RegExp(s, "i")) };
        }
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                filter.$or = [{ bidSubmissionDate: { $gte: start, $lte: end } }];
            }
        }
        const tenders = yield tender_model_1.default.find(filter);
        res.status(200).json({
            message: "Tenders fetched successfully.",
            result: tenders,
            code: 200,
        });
    }
    catch (error) {
        console.error("Error fetching tenders:", error);
        res.status(500).json({
            message: "Error fetching tenders. Please try again.",
            error: error.message,
        });
    }
}));
tenderRoute.get("/industries", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const industries = yield tender_model_1.default.distinct("industry");
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
    }
    catch (error) {
        console.error("Error fetching industries:", error);
        res.status(500).json({
            message: "Error fetching industries. Please try again.",
            error: error.message,
        });
    }
}));
tenderRoute.get("/sub-industries", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const subIndustries = yield tender_model_1.default.distinct("subIndustry");
        const formattedSubIndustries = subIndustries.map((subIndustry, index) => ({
            value: subIndustry.toLowerCase(),
            label: subIndustry,
        }));
        res.status(200).json({
            message: "Sub-industries fetched successfully.",
            subIndustries: formattedSubIndustries,
            code: 200,
        });
    }
    catch (error) {
        console.error("Error fetching sub-industries:", error);
        res.status(500).json({
            message: "Error fetching sub-industries. Please try again.",
            error: error.message,
        });
    }
}));
tenderRoute.delete("/delete/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const tender = yield tender_model_1.default.findByIdAndDelete(id);
        if (!tender) {
            return res.status(404).send("Tender not found.");
        }
        res.status(200).json({
            message: "Tender deleted successfully.",
            result: tender,
            code: 200,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error deleting tender. Please try again.");
    }
}));
tenderRoute.delete("/delete", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tenders = yield tender_model_1.default.deleteMany({});
        res.status(200).json({
            message: "All tenders deleted successfully.",
            result: tenders,
            code: 200,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error deleting tenders. Please try again.");
    }
}));
tenderRoute.delete("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const tenders = yield tender_model_1.default.findByIdAndDelete(id);
        res.status(200).json({
            message: "All tenders deleted successfully.",
            result: tenders,
            code: 200,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error deleting tenders. Please try again.");
    }
}));
tenderRoute.post("/tender-mapping", authenticateUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenderId } = req.body;
    console.log(tenderId, req.user);
    const userId = req.user.userId || "34234234343434";
    if (!tenderId || !userId) {
        return res
            .status(400)
            .json({ message: "Tender ID and User ID are required." });
    }
    try {
        const tenderMapping = new tender_mapping_model_1.default({ tenderId, userId });
        yield tenderMapping.save();
        return res.status(200).json({
            message: "Tender mapping created successfully.",
            result: tenderMapping,
        });
    }
    catch (error) {
        return res
            .status(500)
            .json({ message: "Error creating tender mapping.", error });
    }
}));
tenderRoute.get("/tender-mapping", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const mappings = yield tender_mapping_model_1.default.find()
            .populate("tenderId")
            .populate("userId")
            .sort({ createdAt: -1 });
        res.status(200).json({ mappings });
    }
    catch (error) {
        console.log("Error retrieving mappings:", error);
        res.status(500).json({ message: "Error retrieving mappings.", error });
    }
}));
// Update tender mapping route
tenderRoute.patch("/tender-mapping/:id/note", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("received");
    const { id } = req.params;
    const { note } = req.body;
    try {
        const tenderMapping = yield tender_mapping_model_1.default.findByIdAndUpdate(id, { note }, { new: true });
        if (!tenderMapping) {
            return res.status(404).json({ message: "Tender mapping not found" });
        }
        return res.status(200).json({
            message: "Note added successfully",
            result: tenderMapping,
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Error adding note to tender mapping",
            error,
        });
    }
}));
tenderRoute.post("/contact", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { firstName, lastName, email, companyName, message, type, subject } = req.body;
        const contact = new contact_model_1.default({
            firstName,
            lastName,
            email,
            companyName,
            message,
            type,
            subject,
        });
        yield contact.save();
        res.status(201).json({
            message: "Contact form submitted successfully.",
            code: 201,
            contact,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error submitting contact form. Please try again.");
    }
}));
tenderRoute.get("/contact", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { filter } = req.query;
        const contacts = yield contact_model_1.default.find({ type: filter });
        res.status(200).json({
            message: "Contacts fetched successfully.",
            contacts,
            code: 200,
        });
    }
    catch (error) {
        console.error("Error fetching contacts:", error);
        res.status(500).json({
            message: "Error fetching contacts. Please try again.",
            error: error.message,
        });
    }
}));
tenderRoute.delete("/contactDelete/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Find and delete the contact by ID
        const deletedContact = yield contact_model_1.default.findByIdAndDelete(id);
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
    }
    catch (error) {
        console.error("Error deleting contact:", error);
        res.status(500).json({
            message: "Error deleting contact. Please try again.",
            error: error.message,
            code: 500,
        });
    }
}));
tenderRoute.patch("/contactMarkAsContacted/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Find the contact and update its type to "contacted"
        const updatedContact = yield contact_model_1.default.findByIdAndUpdate(id, { type: "contacted" }, { new: true } // Return the updated document
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
    }
    catch (error) {
        console.error("Error marking contact as contacted:", error);
        res.status(500).json({
            message: "Error marking contact as contacted. Please try again.",
            error: error.message,
            code: 500,
        });
    }
}));
module.exports = tenderRoute;
//# sourceMappingURL=tenderRoute.js.map