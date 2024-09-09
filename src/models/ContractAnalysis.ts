import mongoose, { Document, Schema } from "mongoose";
import { IUser } from "./User";

interface IRisk {
  risk: string;
  explanation: string;
  severity: 'low' | 'medium' | 'high';
}

interface IOpportunity {
  opportunity: string;
  explanation: string;
  impact: 'low' | 'medium' | 'high';
}

interface ICompensationStructure {
  baseSalary: string;
  bonuses: string;
  equity: string;
  otherBenefits: string;
}

export interface IContractAnalysis extends Document {
  userId: IUser['_id'];
  contractText: string;
  risks: IRisk[];
  opportunities: IOpportunity[];
  summary: string;
  recommendations: string[];
  keyClauses: string[];
  legalCompliance: string;
  negotiationPoints: string[];
  contractDuration: string;
  terminationConditions: string;
  compensationStructure: ICompensationStructure;
  performanceMetrics: string[];
  intellectualPropertyClauses: string;
  createdAt: Date;
}

const ContractAnalysisSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  contractText: { type: String, required: true },
  risks: [{ risk: String, explanation: String, severity: String }],
  opportunities: [{ opportunity: String, explanation: String, impact: String }],
  summary: { type: String, required: true },
  recommendations: [{ type: String }],
  keyClauses: [{ type: String }],
  legalCompliance: { type: String },
  negotiationPoints: [{ type: String }],
  contractDuration: { type: String },
  terminationConditions: { type: String },
  compensationStructure: {
    baseSalary: String,
    bonuses: String,
    equity: String,
    otherBenefits: String
  },
  performanceMetrics: [{ type: String }],
  intellectualPropertyClauses: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IContractAnalysis>("ContractAnalysis", ContractAnalysisSchema);