import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  googleId: string;
  email: string;
  displayName: string;
}

const UserSchema: Schema = new Schema({
  googleId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  profilePicture: { type: String, required: false },
});

export default mongoose.model<IUser>("User", UserSchema);