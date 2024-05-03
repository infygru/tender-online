"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const tenderSchema = new mongoose_1.default.Schema({
    name: { type: String },
    description: { type: String },
    epublishedDate: { type: Date, required: true },
    closeingDate: { type: Date, required: true },
    openingDate: { type: Date, required: true },
    refNo: { type: String, required: true },
    title: { type: String },
    TenderId: { type: String, required: true },
    organizationChain: { type: String, required: true },
    AraeSpecification1: { type: String },
    AraeSpecification2: { type: String },
    AraeSpecification3: { type: String },
    active: { type: Boolean, default: true },
});
const Tender = mongoose_1.default.model("Tender", tenderSchema);
exports.default = Tender;
//# sourceMappingURL=tender.model.js.map