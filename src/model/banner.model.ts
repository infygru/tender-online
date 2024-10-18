// src/models/UserModel.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  banner: string;
  isSignup: boolean;
  details?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    banner: { type: String, required: true },
    isSignup: { type: Boolean, required: true },
    details: { type: String, required: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("Banner", UserSchema);
