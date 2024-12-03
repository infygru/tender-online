import mongoose, { Document, Schema } from "mongoose";

interface ITenderMapping extends Document {
  tenderId: mongoose.Types.ObjectId; // Changed to ObjectId
  userId: mongoose.Types.ObjectId; // Changed to ObjectId
}

const TenderMappingSchema: Schema = new Schema(
  {
    tenderId: {
      type: mongoose.Types.ObjectId,
      ref: "Tendernew5",
      required: true,
    },
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "tender-user",
      required: true,
    },
    note: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const TenderMapping = mongoose.model<ITenderMapping>(
  "TenderMapping",
  TenderMappingSchema
);
export default TenderMapping;
