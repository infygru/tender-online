import mongoose, { Schema, Document, Model } from "mongoose";

export interface TenderDocument extends Document {
  tenderName: string;
  description?: string;
  epublishedDate: string;
  bidSubmissionDate: Date;
  bidOpeningDate: Date;
  tenderValue: string;
  refNo: string;
  TenderId: string;
  district: string;
  state: string;
  department: string;
  subDepartment?: string;
  location?: string;
  address?: string;
  pincode: string;
  active?: boolean;
  industry?: string;
  subIndustry?: string;
  classification?: string;
  EMDAmountin?: string;
  WorkDescription?: string;
}

const tenderSchema: Schema<TenderDocument> = new mongoose.Schema({
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
    required: true,
  },
  bidOpeningDate: {
    type: Date,
    required: true,
  },
  tenderValue: {
    type: String,
    required: true,
  },
  refNo: {
    type: String,
    required: true,
  },
  TenderId: {
    type: String,
    required: true,
  },
  district: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    required: true,
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

const Tender: Model<TenderDocument> = mongoose.model<TenderDocument>(
  "Tendernew5",
  tenderSchema
);

export default Tender;
