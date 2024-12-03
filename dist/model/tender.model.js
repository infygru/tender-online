"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const tenderSchema = new mongoose_1.default.Schema({
    tenderName: {
        type: String,
        required: false,
    },
    description: {
        type: String,
        required: false,
    },
    epublishedDate: {
        type: String,
        required: false,
    },
    bidSubmissionDate: {
        type: Date,
        required: false,
    },
    bidOpeningDate: {
        type: Date,
        required: false,
    },
    tenderValue: {
        type: String,
        required: false,
    },
    refNo: {
        type: String,
        required: false,
    },
    TenderId: {
        type: String,
        required: false,
    },
    district: {
        type: String,
        required: false,
    },
    state: {
        type: String,
        required: false,
    },
    department: {
        type: String,
        required: false,
    },
    subDepartment: {
        type: String,
        required: false,
    },
    location: {
        type: String,
        required: false,
    },
    address: {
        type: String,
        required: false,
    },
    pincode: {
        type: String,
        required: false,
    },
    active: {
        type: Boolean,
        default: false,
    },
    industry: {
        type: String,
        required: false,
    },
    subIndustry: {
        type: String,
        required: false,
    },
    classification: {
        type: String,
        required: false,
    },
    EMDAmountin: {
        type: String,
        required: false,
    },
    WorkDescription: {
        type: String,
        required: false,
    },
});
const Tender = mongoose_1.default.model("Tendernew5", tenderSchema);
exports.default = Tender;
//# sourceMappingURL=tender.model.js.map