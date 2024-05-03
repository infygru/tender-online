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
const express = require("express");
const tenderRoute = express.Router();
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
            const randomNumber = generateRandomNumber(100, 999);
            TenderId = `TENDER${randomNumber}`;
            // Check if TenderId already exists in the database
            const existingTender = yield tender_model_1.default.findOne({ TenderId });
            if (!existingTender) {
                isUnique = true;
            }
        }
        const newTender = new tender_model_1.default(Object.assign(Object.assign({}, req.body), { TenderId }));
        yield newTender.save();
        res.status(201).json({
            message: "Tender created successfully.",
            result: newTender,
            code: 201,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error creating tender. please try again.");
    }
}));
tenderRoute.post("/upload/bulk", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tenders = req.body.map((tender) => ({
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
        const result = yield tender_model_1.default.insertMany(tenders);
        res.status(201).json({
            message: "Tenders uploaded successfully.",
            result,
            code: 201,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error uploading tenders. Please try again.");
    }
}));
tenderRoute.get("/all", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tenders = yield tender_model_1.default.find();
        res.status(200).json({
            message: "Tenders fetched successfully.",
            result: tenders,
            code: 200,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error fetching tenders. Please try again.");
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
module.exports = tenderRoute;
//# sourceMappingURL=tenderRoute.js.map