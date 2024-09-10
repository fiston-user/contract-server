import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  googleId: string;
  email: string;
  displayName: string;
  isPremium: boolean;
  // You might also want to add:
  // premiumExpiryDate: Date;
}

const UserSchema: Schema = new Schema({
  googleId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  isPremium: { type: Boolean, default: false },
  // premiumExpiryDate: { type: Date },
  stripeCustomerId: { type: String },
});

export default mongoose.model<IUser>("User", UserSchema);