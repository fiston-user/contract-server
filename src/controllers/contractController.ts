import { Request, Response } from "express";
import { IUser } from "../models/User";
import ContractAnalysis from "../models/ContractAnalysis";
import fs from "fs/promises";
import {
  analyzeContractWithAI,
  extractTextFromPDF,
} from "../services/aiService";
import multer from "multer";
import path from "path";
import {
  detectLanguage,
  calculateExpirationDate,
} from "../utils/contractUtils";

// Configure multer for file upload
const upload = multer({
  storage: multer.diskStorage({
    destination: "./uploads/",
    filename: (
      req: Express.Request,
      file: Express.Multer.File,
      cb: (error: Error | null, filename: string) => void
    ) => {
      cb(
        null,
        file.fieldname + "-" + Date.now() + path.extname(file.originalname)
      );
    },
  }),
  fileFilter: (
    req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(null, false);
      cb(new Error("Only PDF files are allowed!"));
    }
  },
}).single("contract"); // Change this line to accept a single file with field name 'contract'

export const analyzeContract = async (req: Request, res: Response) => {
  const user = req.user as IUser;

  if (!req.file) {
    return res.status(400).json({ error: "No PDF file uploaded" });
  }

  try {
    const pdfText = await extractTextFromPDF(req.file.path);
    let analysis;

    if (user.isPremium) {
      analysis = await analyzeContractWithAI(pdfText, "premium");
    } else {
      analysis = await analyzeContractWithAI(pdfText, "free");
    }

    // Validate the AI response
    if (!analysis.summary || !analysis.risks || !analysis.opportunities) {
      throw new Error("Invalid AI analysis response");
    }

    const language = await detectLanguage(pdfText);

    const savedAnalysis = await ContractAnalysis.create({
      userId: user._id,
      contractText: pdfText,
      ...analysis,
      language,
      expirationDate:
        user.isPremium && analysis.contractDuration
          ? calculateExpirationDate(analysis.contractDuration)
          : undefined,
    });

    await fs.unlink(req.file.path);

    res.json(savedAnalysis);
  } catch (error) {
    console.error("Error analyzing contract:", error);
    res
      .status(500)
      .json({ error: "An error occurred while analyzing the contract" });
  }
};

export const getUserContracts = async (req: Request, res: Response) => {
  const user = req.user as IUser;

  try {
    const contracts = await ContractAnalysis.find({ userId: user._id }).sort({
      createdAt: -1,
    });
    res.json(contracts);
  } catch (error) {
    console.error("Error fetching user contracts:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching contracts" });
  }
};

export const getContractById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user as IUser;

  try {
    const contract = await ContractAnalysis.findOne({
      _id: id,
      userId: user._id,
    });
    if (!contract) {
      return res.status(404).json({ error: "Contract analysis not found" });
    }

    res.json(contract);
  } catch (error) {
    console.error("Error fetching contract by ID:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the contract" });
  }
};

export const uploadMiddleware = upload;

export const addUserFeedback = async (req: Request, res: Response) => {
  const { contractId } = req.params;
  const { rating, comments } = req.body;
  const user = req.user as IUser;

  try {
    const updatedContract = await ContractAnalysis.findOneAndUpdate(
      { _id: contractId, userId: user._id },
      { userFeedback: { rating, comments } },
      { new: true }
    );

    if (!updatedContract) {
      return res.status(404).json({ error: "Contract analysis not found" });
    }

    res.json(updatedContract);
  } catch (error) {
    console.error("Error adding user feedback:", error);
    res.status(500).json({ error: "An error occurred while adding feedback" });
  }
};
