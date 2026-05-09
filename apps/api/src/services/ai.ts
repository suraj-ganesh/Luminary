import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

export async function analyzeViolations(violations: any[]) {
  const key = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
  if (!key) {
    console.warn("No Gemini API Key found. Skipping AI analysis.");
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

  console.log(`Analyzing top ${topViolations.length} violations with AI (Direct Fetch)...`);

  const analyzedTop = await processBatch(topViolations, key);
  
  return [...analyzedTop, ...remainingViolations];
}

async function processBatch(batch: any[], key: string) {
  const analysisPromises = batch.map(async (v) => {
    try {
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

      console.log(`Generating AI remediation for ${v.id} in background...`);
      
      // List of models to try in order of likelihood to work
      const modelsToTry = [
        { name: 'gemini-2.5-flash-lite', version: 'v1beta' },
        { name: 'gemini-2.5-flash', version: 'v1beta' },
        { name: 'gemini-2.5-pro', version: 'v1beta' },
        { name: 'gemini-2.0-flash-lite-001', version: 'v1beta' },
        { name: 'gemini-2.0-flash-001', version: 'v1beta' }
      ];

      let successResult = null;

      for (const modelConfig of modelsToTry) {
        try {
          const apiResponse = await fetch(`https://generativelanguage.googleapis.com/${modelConfig.version}/models/${modelConfig.name}:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          });

          if (apiResponse.ok) {
            successResult = await apiResponse.json();
            console.log(`Successfully generated background remediation with ${modelConfig.name} for ${v.id}!`);
            break;
          }
        } catch (e) {
          console.warn(`Background fetch failed for ${modelConfig.name}`);
        }
      }

      if (!successResult) return v;

      const text = successResult.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
