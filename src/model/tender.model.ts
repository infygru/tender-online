import mongoose, { Schema, Document, Model } from "mongoose";

export interface TenderDocument extends Document {
  tenderName: string;
  description?: string;
  epublishedDate: Date;
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
    type: Date,
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
    unique: true,
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
});

const Tender: Model<TenderDocument> = mongoose.model<TenderDocument>(
  "Tender",
  tenderSchema
);

export default Tender;
