import mongoose, { Schema, Document } from "mongoose";

export interface IContact extends Document {
  firstName: string;
  lastName?: string;
  companyName?: string;
  email: string;
  message: string;
  type: string;
  clientId?: string;
  subject?: string;
  phoneNumber?: string;
}

const ContactSchema: Schema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: false },
    email: { type: String, required: false },
    companyName: { type: String },
    message: { type: String, required: false },
    type: { type: String, default: "support" },
    clientId: { type: String },
    subject: { type: String },
    phoneNumber: { type: String },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IContact>("Contact1", ContactSchema);
