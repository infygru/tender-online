import mongoose, { Document, Schema, Model } from "mongoose";

// Interface for Ad Image
export interface IAdImage extends Document {
  title: string;
  description?: string;
  imageUrl: string;
  createdAt: Date;
  url: string;
  type: string;
  active: boolean;
}

// Define the schema for Ad Image
const AdImageSchema: Schema<IAdImage> = new Schema<IAdImage>({
  title: { type: String, required: true },
  description: { type: String },
  imageUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  url: { type: String },
  type: { type: String, default: "ad" },
  active: { type: Boolean, default: true },
});

// Create the model from the schema
const AdImage: Model<IAdImage> = mongoose.model<IAdImage>(
  "AdImage",
  AdImageSchema
);

export default AdImage;
