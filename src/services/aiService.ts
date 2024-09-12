import { GoogleGenerativeAI } from "@google/generative-ai";
import * as pdfjsLib from "pdfjs-dist";
import fs from "fs/promises";
import ContractAnalysis from "../models/ContractAnalysis";
import mongoose from "mongoose";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export const extractTextFromPDF = async (filePath: string): Promise<string> => {
  const data = new Uint8Array(await fs.readFile(filePath));
  const pdf = await pdfjsLib.getDocument(data).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item: any) => item.str).join(" ") + "\n";
  }
  return text;
};

export const analyzeContractWithAI = async (
  contractText: string,
  tier: "free" | "premium"
) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  let prompt;
  if (tier === "premium") {
    prompt = `
      Analyze the following employment contract and provide:
      1. A list of at least 10 potential risks for the employee, each with a brief explanation and severity level (low, medium, high).
      2. A list of at least 10 potential opportunities or benefits for the employee, each with a brief explanation and impact level (low, medium, high).
      3. A comprehensive summary of the contract, including key terms and conditions.
      4. Any recommendations for improving the contract from the employee's perspective.
      5. A list of key clauses in the contract.
      6. An assessment of the contract's legal compliance.
      7. A list of potential negotiation points.
      8. The contract duration or term.
      9. A summary of termination conditions.
      10. A breakdown of the compensation structure.
      11. Any performance metrics or KPIs mentioned.
      12. A summary of intellectual property clauses.
      13. An overall score from 1 to 100, with 100 being the highest This score represents the overall favorability of the contract based on the identified risks and opportunities..



      Format your response as a JSON object with the following structure:
      {
        "risks": [{"risk": "Risk description", "explanation": "Brief explanation", "severity": "low|medium|high"}],
        "opportunities": [{"opportunity": "Opportunity description", "explanation": "Brief explanation", "impact": "low|medium|high"}],
        "summary": "Comprehensive summary of the contract",
        "recommendations": ["Recommendation 1", "Recommendation 2", ...],
        "keyClauses": ["Clause 1", "Clause 2", ...],
        "legalCompliance": "Assessment of legal compliance",
        "negotiationPoints": ["Point 1", "Point 2", ...],
        "contractDuration": "Duration of the contract",
        "terminationConditions": "Summary of termination conditions",
        "overallScore": "Overall score from 1 to 100",
        "compensationStructure": {
          "baseSalary": "Amount",
          "bonuses": "Description",
          "equity": "Description",
          "otherBenefits": "Description"
        },
        "performanceMetrics": ["Metric 1", "Metric 2", ...],
        "intellectualPropertyClauses": "Summary of IP clauses"
      }
    `;
  } else {
    prompt = `
      Analyze the following employment contract and provide:
      1. A list of 6 potential risks for the employee, each with a brief explanation.
      2. A list of 6 potential opportunities or benefits for the employee, each with a brief explanation.
      3. A brief summary of the contract.
      4. An overall score from 1 to 100, with 100 being the highest. This score represents the overall favorability of the contract based on the identified risks and opportunities.

      Format your response as a JSON object with the following structure:
      {
        "risks": [{"risk": "Risk description", "explanation": "Brief explanation"}],
        "opportunities": [{"opportunity": "Opportunity description", "explanation": "Brief explanation"}],
        "overallScore": "Overall score from 1 to 100",
        "summary": "Brief summary of the contract"
      }
    `;
  }

  prompt += `
    Important: Provide only the JSON object in your response, without any additional text or formatting.

    Contract text:
    ${contractText}
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  let text = response.text();

  // Remove any markdown formatting
  text = text.replace(/```json\n?|\n?```/g, "").trim();

  try {
    const analysis = JSON.parse(text);
    return analysis;
  } catch (error) {
    console.error("Error parsing AI response:", error);
    console.error("Raw AI response:", text);
    return {
      risks: [],
      opportunities: [],
      summary: "Error analyzing contract. Please try again.",
      overallScore: 0,
    };
  }
};

export const chatWithAI = async (
  contractId: string,
  userQuestion: string,
  userId: string
) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  // Fetch the contract analysis from the database
  const contractAnalysis = await ContractAnalysis.findOne({
    _id: contractId,
    userId: new mongoose.Types.ObjectId(userId),
  });

  if (!contractAnalysis) {
    throw new Error("Contract not found or unauthorized access");
  }

  // Prepare a summary of the contract for context
  const contractSummary = `
    Contract Summary:
    - Overall Score: ${contractAnalysis.overallScore}
    - Key Clauses: ${contractAnalysis.keyClauses.join(", ")}
    - Contract Duration: ${contractAnalysis.contractDuration}
    - Compensation: Base Salary - ${
      contractAnalysis.compensationStructure.baseSalary
    }, 
                    Bonuses - ${contractAnalysis.compensationStructure.bonuses}
    - Termination Conditions: ${contractAnalysis.terminationConditions}
  `;

  const contractText = contractAnalysis.contractText;

  const prompt = `
    You are an AI assistant specialized in analyzing employment contracts. You have previously analyzed a contract with the following summary:

    ${contractSummary}

    The full contract text is:
    ${contractText}

    A user has asked the following question:
    "${userQuestion}"

    Please provide a helpful, informative, and concise answer based on the contract analysis. Consider the following guidelines:

    1. If the question is directly related to the contract, provide specific information from the analysis.
    2. If the question is somewhat related but not specific, try to provide relevant information from the contract that might be helpful.
    3. If the question is not related to the contract at all, politely redirect the user to ask about contract-related topics.
    4. If the question is too vague or short, ask for clarification while providing some general information about the contract.
    5. Always maintain a professional and helpful tone.
    6. If asked about legal advice, remind the user that you cannot provide legal advice and recommend consulting with a legal professional.

    Your response:
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
};
