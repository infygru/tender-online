import mongoose, { Schema, Document, Model } from "mongoose";

export interface TenderDocument extends Document {
  name?: string;
  description?: string;
  epublishedDate: Date;
  closeingDate: Date;
  openingDate: Date;
  refNo: string;
  TenderId: string;
  organizationChain: string;
  title: string;
  AraeSpecification1?: string;
  AraeSpecification2?: string;
  AraeSpecification3?: string;
  active?: boolean;
}

const tenderSchema: Schema<TenderDocument> = new mongoose.Schema({
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

const Tender: Model<TenderDocument> = mongoose.model<TenderDocument>(
  "Tender",
  tenderSchema
);

export default Tender;
