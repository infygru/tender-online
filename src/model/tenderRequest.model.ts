import mongoose, { Document, Schema, Model } from "mongoose";

const tenderRequest = new Schema(
  {
    tenderTitle: { type: String },
    tenderId: { type: String },
    district: { type: String },
    state: { type: String },
    location: { type: String },
    bidSubmissionDate: { type: String },
    tenderValue: { type: String },
    refNo: { type: String },
    industry: { type: String },
    address: { type: String },
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "tender-user",
      required: true,
    },
    note: { type: String },
  },
  { timestamps: true }
);

const TenderRequest = mongoose.model("TenderRequest", tenderRequest);
export default TenderRequest;
