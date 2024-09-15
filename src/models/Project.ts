import mongoose, { Document, Schema } from "mongoose";
import { IUser } from "./User";

export interface IProject extends Document {
  name: string;
  description: string;
  userId: IUser["_id"];
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IProject>("Project", ProjectSchema);