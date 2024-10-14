import mongoose, { Schema, Document } from "mongoose";

export interface IContact extends Document {
  firstName: string;
  lastName: string;
  companyName?: string;
  email: string;
  message: string;
}

const ContactSchema: Schema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    companyName: { type: String },
    message: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IContact>("Contact1", ContactSchema);
