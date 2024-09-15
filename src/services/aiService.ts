import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDocument } from "pdfjs-dist";
import redis from "../config/redis";
import ContractAnalysis from "../models/ContractAnalysis";
import mongoose from "mongoose";

const AI_MODEL = "gemini-pro";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export const extractTextFromPDF = async (fileKey: string): Promise<string> => {
  try {
    const fileData = await redis.get(fileKey);
    if (!fileData) {
      throw new Error(`File not found in Redis for key: ${fileKey}`);
    }

    let fileBuffer: Uint8Array;
    if (Buffer.isBuffer(fileData)) {
      fileBuffer = new Uint8Array(fileData);
    } else if (typeof fileData === "object" && fileData !== null) {
      // Check if the object has the expected structure
      const bufferData = fileData as { type?: string; data?: number[] };
      if (bufferData.type === "Buffer" && Array.isArray(bufferData.data)) {
        fileBuffer = new Uint8Array(bufferData.data);
      } else {
        throw new Error(
          `Invalid file data structure in Redis for key: ${fileKey}`
        );
      }
    } else {
      throw new Error(
        `Invalid file data type in Redis for key: ${fileKey}. Got ${typeof fileData}`
      );
    }

    const pdf = await getDocument({ data: fileBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(" ") + "\n";
    }
    return text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error(
      `Failed to extract text from PDF: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

export const detectLanguageWithAI = async (text: string): Promise<string> => {
  const model = genAI.getGenerativeModel({ model: AI_MODEL });
  const prompt = `
    Detect the language of the following text. Respond with only the ISO 639-1 two-letter language code (e.g., "en" for English, "fr" for French, etc.).
    Do not include any additional explanation or text.

    Text:
    ${text.substring(
      0,
      500
    )} // Use the first 500 characters for language detection
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text().trim().toLowerCase();
};

export const analyzeContractWithAI = async (
  contractText: string,
  tier: "free" | "premium",
  contractType: string
) => {
  const model = genAI.getGenerativeModel({ model: AI_MODEL });

  // Detect the language of the contract using AI
  const language = await detectLanguageWithAI(contractText);
  console.log("Language detected:", language);

  let prompt;
  if (tier === "premium") {
    prompt = `
      Analyze the following ${contractType} contract and provide:
      1. A list of at least 10 potential risks for the party receiving the contract, each with a brief explanation and severity level (low, medium, high).
      2. A list of at least 10 potential opportunities or benefits for the receiving party, each with a brief explanation and impact level (low, medium, high).
      3. A comprehensive summary of the contract, including key terms and conditions.
      4. Any recommendations for improving the contract from the receiving party's perspective.
      5. A list of key clauses in the contract.
      6. An assessment of the contract's legal compliance.
      7. A list of potential negotiation points.
      8. The contract duration or term, if applicable.
      9. A summary of termination conditions, if applicable.
      10. A breakdown of any financial terms or compensation structure, if applicable.
      11. Any performance metrics or KPIs mentioned, if applicable.
      12. A summary of any specific clauses relevant to this type of contract (e.g., intellectual property for employment contracts, warranties for sales contracts).
      13. An overall score from 1 to 100, with 100 being the highest. This score represents the overall favorability of the contract based on the identified risks and opportunities.

      Format your response as a JSON object with the following structure:
      {
        "risks": [{"risk": "Risk description", "explanation": "Brief explanation", "severity": "low|medium|high"}],
        "opportunities": [{"opportunity": "Opportunity description", "explanation": "Brief explanation", "impact": "low|medium|high"}],
        "summary": "Comprehensive summary of the contract",
        "recommendations": ["Recommendation 1", "Recommendation 2", ...],
        "keyClauses": ["Clause 1", "Clause 2", ...],
        "legalCompliance": "Assessment of legal compliance",
        "negotiationPoints": ["Point 1", "Point 2", ...],
        "contractDuration": "Duration of the contract, if applicable",
        "terminationConditions": "Summary of termination conditions, if applicable",
        "overallScore": "Overall score from 1 to 100",
        "financialTerms": {
          "description": "Overview of financial terms",
          "details": ["Detail 1", "Detail 2", ...]
        },
        "performanceMetrics": ["Metric 1", "Metric 2", ...],
        "specificClauses": "Summary of clauses specific to this contract type"
      }
    `;
  } else {
    prompt = `
      Analyze the following ${contractType} contract and provide:
      1. A list of 6 potential risks for the receiving party, each with a brief explanation.
      2. A list of 6 potential opportunities or benefits for the receiving party, each with a brief explanation.
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
    Ensure that all text in the JSON object is in the same language as the original contract (${language}).
 
    Contract text:
    ${contractText}
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  let text = response.text();

  // Remove any markdown formatting
  text = text.replace(/```json\n?|\n?```/g, "").trim();

  try {
    // Attempt to fix common JSON errors
    text = text.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3'); // Ensure all keys are quoted
    text = text.replace(/:\s*"([^"]*)"([^,}\]])/g, ': "$1"$2'); // Ensure all string values are properly quoted
    text = text.replace(/,\s*}/g, "}"); // Remove trailing commas

    const analysis = JSON.parse(text);
    return analysis;
  } catch (error) {
    console.error("Error parsing AI response:", error);
    console.error("Raw AI response:", text);

    // Define the types for risks and opportunities
    interface Risk {
      risk: string;
      explanation: string;
    }

    interface Opportunity {
      opportunity: string;
      explanation: string;
    }

    // Properly type the fallbackAnalysis object
    const fallbackAnalysis: {
      risks: Risk[];
      opportunities: Opportunity[];
      summary: string;
      overallScore: number;
    } = {
      risks: [],
      opportunities: [],
      summary: "Error analyzing contract. Partial results available.",
      overallScore: 0,
    };

    // Extract risks
    const risksMatch = text.match(/"risks"\s*:\s*\[([\s\S]*?)\]/);
    if (risksMatch) {
      fallbackAnalysis.risks = risksMatch[1].split("},").map((risk) => {
        const riskMatch = risk.match(/"risk"\s*:\s*"([^"]*)"/);
        const explanationMatch = risk.match(/"explanation"\s*:\s*"([^"]*)"/);
        return {
          risk: riskMatch ? riskMatch[1] : "Unknown risk",
          explanation: explanationMatch
            ? explanationMatch[1]
            : "No explanation provided",
        };
      });
    }

    // Extract opportunities
    const opportunitiesMatch = text.match(
      /"opportunities"\s*:\s*\[([\s\S]*?)\]/
    );
    if (opportunitiesMatch) {
      fallbackAnalysis.opportunities = opportunitiesMatch[1]
        .split("},")
        .map((opportunity) => {
          const opportunityMatch = opportunity.match(
            /"opportunity"\s*:\s*"([^"]*)"/
          );
          const explanationMatch = opportunity.match(
            /"explanation"\s*:\s*"([^"]*)"/
          );
          return {
            opportunity: opportunityMatch
              ? opportunityMatch[1]
              : "Unknown opportunity",
            explanation: explanationMatch
              ? explanationMatch[1]
              : "No explanation provided",
          };
        });
    }

    // Extract summary
    const summaryMatch = text.match(/"summary"\s*:\s*"([^"]*)"/);
    if (summaryMatch) {
      fallbackAnalysis.summary = summaryMatch[1];
    }

    // Extract overall score
    const scoreMatch = text.match(/"overallScore"\s*:\s*(\d+)/);
    if (scoreMatch) {
      fallbackAnalysis.overallScore = parseInt(scoreMatch[1]);
    }

    return fallbackAnalysis;
  }
};

export const chatWithAI = async (
  contractId: string,
  userQuestion: string,
  userId: string
) => {
  const model = genAI.getGenerativeModel({ model: AI_MODEL });

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
    Contract Summary (${contractAnalysis.contractType}):
    - Overall Score: ${contractAnalysis.overallScore}
    - Key Clauses: ${contractAnalysis.keyClauses.join(", ")}
    - Contract Duration: ${contractAnalysis.contractDuration || "N/A"}
    - Financial Terms: ${contractAnalysis.financialTerms?.description || "N/A"}
    - Termination Conditions: ${contractAnalysis.terminationConditions || "N/A"}
  `;

  const contractText = contractAnalysis.contractText;

  const prompt = `
    You are an AI assistant specialized in analyzing contracts. You have previously analyzed a contract with the following summary:

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
    7. Always respond in the same language as the original contract (${contractAnalysis.language}).

    Your response:
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
};

export const detectContractType = async (
  contractText: string
): Promise<string> => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
    Analyze the following contract text and determine the type of contract it is.
    Provide only the contract type as a single string (e.g., "Employment", "Non-Disclosure Agreement", "Sales", "Lease", etc.).
    Do not include any additional explanation or text.

    Contract text:
    ${contractText.substring(
      0,
      2000
    )} // We'll use the first 2000 characters to keep the prompt shorter
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
};
