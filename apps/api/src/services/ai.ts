import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function analyzeViolations(violations: any[]) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("No GEMINI_API_KEY found. Skipping AI analysis.");
    return violations;
  }

  // Sort violations by impact (Critical > Serious > Moderate > Minor)
  const impactOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };
  const sortedViolations = [...violations].sort((a, b) => 
    (impactOrder[a.impact as keyof typeof impactOrder] ?? 4) - 
    (impactOrder[b.impact as keyof typeof impactOrder] ?? 4)
  );

  // Limit to top 8 violations to be safe with Gemini free tier rate limits (15 RPM)
  const topViolations = sortedViolations.slice(0, 8);
  const remainingViolations = sortedViolations.slice(8);

  console.log(`Analyzing top ${topViolations.length} violations with AI...`);

  const analyzedTop = await processBatch(topViolations);
  
  return [...analyzedTop, ...remainingViolations];
}

async function processBatch(batch: any[]) {
  const analysisPromises = batch.map(async (v) => {
    const prompt = `
      You are an accessibility expert. Analyze the following WCAG violation:
      Rule: ${v.id}
      Description: ${v.description}
      Help: ${v.help}
      Impact: ${v.impact}
      
      HTML Snippet: ${v.nodes[0]?.html || "N/A"}
      
      Please provide:
      1. A plain-English explanation of why this is an issue.
      2. A specific code fix for the provided HTML snippet.
      
      Format the response as JSON:
      {
        "explanation": "...",
        "fix": "..."
      }
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const aiData = JSON.parse(jsonMatch[0]);
        return {
          ...v,
          ai_explanation: aiData.explanation,
          ai_fix: aiData.fix
        };
      }
      return v;
    } catch (error) {
      console.error(`AI Analysis failed for ${v.id}:`, error);
      return v;
    }
  });

  return Promise.all(analysisPromises);
}
