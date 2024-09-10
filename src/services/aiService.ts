import { GoogleGenerativeAI } from "@google/generative-ai";
import * as pdfjsLib from "pdfjs-dist";
import fs from "fs/promises";

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
      1. A list of at least 5 potential risks for the employee, each with a brief explanation and severity level (low, medium, high).
      2. A list of at least 5 potential opportunities or benefits for the employee, each with a brief explanation and impact level (low, medium, high).
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
      1. A list of 3 potential risks for the employee, each with a brief explanation.
      2. A list of 3 potential opportunities or benefits for the employee, each with a brief explanation.
      3. A brief summary of the contract.

      Format your response as a JSON object with the following structure:
      {
        "risks": [{"risk": "Risk description", "explanation": "Brief explanation"}],
        "opportunities": [{"opportunity": "Opportunity description", "explanation": "Brief explanation"}],
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
      recommendations: [],
    };
  }
};
