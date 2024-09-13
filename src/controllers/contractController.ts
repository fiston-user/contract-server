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
import { chatWithAI } from "../services/aiService";
import mongoose from "mongoose";
import redis from "../config/redis";
import { detectContractType } from "../services/aiService"; // Add this import

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

export const detectAndConfirmContractType = async (
  req: Request,
  res: Response
) => {
  const user = req.user as IUser;

  if (!req.file) {
    return res.status(400).json({ error: "No PDF file uploaded" });
  }

  try {
    const pdfText = await extractTextFromPDF(req.file.path);
    const detectedType = await detectContractType(pdfText);

    res.json({ detectedType });
  } catch (error) {
    console.error("Error detecting contract type:", error);
    res
      .status(500)
      .json({ error: "An error occurred while detecting the contract type" });
  }
};

export const analyzeContract = async (req: Request, res: Response) => {
  const user = req.user as IUser;
  const { contractType } = req.body; // Add this line to get the contract type from the request

  if (!req.file) {
    return res.status(400).json({ error: "No PDF file uploaded" });
  }

  if (!contractType) {
    return res.status(400).json({ error: "Contract type is required" });
  }

  try {
    const pdfText = await extractTextFromPDF(req.file.path);
    let analysis;

    if (user.isPremium) {
      analysis = await analyzeContractWithAI(pdfText, "premium", contractType);
    } else {
      analysis = await analyzeContractWithAI(pdfText, "free", contractType);
    }

    // Validate the AI response
    if (!analysis.summary || !analysis.risks || !analysis.opportunities) {
      throw new Error("Invalid AI analysis response");
    }

    const language = await detectLanguage(pdfText);

    const savedAnalysis = await ContractAnalysis.create({
      userId: user._id,
      contractText: pdfText,
      contractType, // Add this line
      ...analysis,
      language,
      expirationDate:
        user.isPremium && analysis.contractDuration
          ? calculateExpirationDate(analysis.contractDuration)
          : undefined,
    });

    // Invalidate cache for user's contracts list
    await redis.del(`user_contracts:${user._id}`);

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
    // Check cache first
    const cachedContracts = await redis.get(`user_contracts:${user._id}`);
    if (cachedContracts) {
      // The cached data is already an object, no need to parse
      console.log("Cached contracts");
      return res.json(cachedContracts);
    }

    // If not in cache, fetch from database
    const contracts = await ContractAnalysis.find({ userId: user._id }).sort({
      createdAt: -1,
    });

    // Cache the result for future requests
    await redis.set(`user_contracts:${user._id}`, contracts, {
      ex: 300,
    }); // Cache for 5 minutes

    console.log("Fetched from database");
    res.json(contracts);
  } catch (error) {
    console.error("Error fetching user contracts:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching contracts" });
  }
};

export const deleteContractById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user as IUser;

  try {
    const contract = await ContractAnalysis.findOneAndDelete({
      _id: id,
      userId: user._id,
    });
    if (!contract) {
      return res.status(404).json({ error: "Contract analysis not found" });
    }

    // Invalidate cache for user's contracts list
    await redis.del(`user_contracts:${user._id}`);

    res.json({ message: "Contract analysis deleted successfully" });
  } catch (error) {
    console.error("Error deleting contract by ID:", error);
    res
      .status(500)
      .json({ error: "An error occurred while deleting the contract" });
  }
};

export const getContractById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user as IUser;

  try {
    // Check cache first
    const cachedContract = await redis.get(`contract:${id}`);
    if (cachedContract) {
      // The cached data is already an object, no need to parse
      return res.json(cachedContract);
    }

    // If not in cache, fetch from database
    const contract = await ContractAnalysis.findOne({
      _id: id,
      userId: user._id,
    });

    if (!contract) {
      return res.status(404).json({ error: "Contract analysis not found" });
    }

    // Cache the result for future requests
    await redis.set(`contract:${id}`, contract, { ex: 3600 }); // Cache for 1 hour

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

export const askQuestionAboutContract = async (req: Request, res: Response) => {
  const user = req.user as IUser | undefined;
  const { contractId } = req.params;
  const { question } = req.body;

  if (!user || !user._id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "A valid question is required" });
  }

  try {
    const userIdString = user._id.toString();
    const answer = await chatWithAI(contractId, question.trim(), userIdString);

    // Process the answer to provide a more structured response
    const response = {
      answer,
      isContractRelated: !answer
        .toLowerCase()
        .includes("not related to the contract"),
      requiresLegalAdvice: answer
        .toLowerCase()
        .includes("recommend consulting with a legal professional"),
      followUpSuggestions: generateFollowUpSuggestions(answer, question),
    };

    res.json(response);
  } catch (error) {
    console.error("Error chatting with AI:", error);
    if (
      error instanceof Error &&
      error.message === "Contract not found or unauthorized access"
    ) {
      res.status(404).json({
        error: "Contract not found or you don't have permission to access it",
      });
    } else {
      res
        .status(500)
        .json({ error: "An error occurred while processing your question" });
    }
  }
};

// Helper function to generate follow-up suggestions
function generateFollowUpSuggestions(
  answer: string,
  question: string
): string[] {
  const suggestions = [];
  const lowercaseQuestion = question.toLowerCase();
  const lowercaseAnswer = answer.toLowerCase();

  if (
    !lowercaseQuestion.includes("compensation") &&
    !lowercaseQuestion.includes("salary") &&
    (lowercaseAnswer.includes("salary") ||
      lowercaseAnswer.includes("compensation"))
  ) {
    suggestions.push("Can you explain more about the compensation structure?");
  }
  if (
    !lowercaseQuestion.includes("termination") &&
    !lowercaseQuestion.includes("end of contract") &&
    (lowercaseAnswer.includes("termination") ||
      lowercaseAnswer.includes("end of contract"))
  ) {
    suggestions.push(
      "What are the specific conditions for contract termination?"
    );
  }
  if (
    !lowercaseQuestion.includes("intellectual property") &&
    !lowercaseQuestion.includes("ip") &&
    (lowercaseAnswer.includes("intellectual property") ||
      lowercaseAnswer.includes("ip"))
  ) {
    suggestions.push("Can you elaborate on the intellectual property clauses?");
  }
  if (
    !lowercaseQuestion.includes("benefits") &&
    lowercaseAnswer.includes("benefits")
  ) {
    suggestions.push("What other benefits are included in the contract?");
  }
  if (
    !lowercaseQuestion.includes("non-compete") &&
    lowercaseAnswer.includes("non-compete")
  ) {
    suggestions.push("Can you explain the non-compete clause in more detail?");
  }
  if (
    !lowercaseQuestion.includes("performance") &&
    lowercaseAnswer.includes("performance")
  ) {
    suggestions.push(
      "Are there any performance-related clauses or metrics in the contract?"
    );
  }

  // If we don't have any suggestions based on the answer, add some general ones
  if (suggestions.length === 0) {
    suggestions.push(
      "What are the key points I should be aware of in this contract?",
      "Are there any unusual or potentially concerning clauses in this contract?",
      "How does this contract compare to industry standards?"
    );
  }

  // Limit to 3 suggestions
  return suggestions.slice(0, 3);
}
