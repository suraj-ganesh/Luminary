import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Generate AI Remediation for a specific violation
router.post('/generate', async (req, res) => {
  const { html, violation, context } = req.body;

  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    return res.status(401).json({ error: 'AI Engine Configuration Error', message: 'No Gemini API Key found in server environment.' });
  }

  if (!html || !violation) {
    return res.status(400).json({ error: 'Missing html or violation details' });
  }

  try {
    const prompt = `
      You are an expert web accessibility engineer.
      I have a WCAG violation in an HTML snippet.
      
      Violation ID/Details: ${violation}
      Context/Impact: ${context || 'Unknown'}
      Original HTML:
      \`\`\`html
      ${html}
      \`\`\`
      
      Please provide:
      1. A fixed version of the HTML that resolves the accessibility issue.
      2. A brief, plain-English explanation of why the change was made and how it helps.
      3. The impact severity of this issue (Critical, High, Medium, or Low).
      
      Respond STRICTLY with a valid JSON object matching this schema exactly, and NO markdown code blocks around the JSON:
      {
        "fixedCode": "<the fixed HTML string>",
        "explanation": "<your explanation string>",
        "impact": "<severity string>"
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    console.log('Gemini Response:', responseText);
    
    // Parse the JSON out of the response, handling potential markdown formatting
    let jsonStr = responseText;
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    try {
      const parsed = JSON.parse(jsonStr);

      // Simulate network delay for that "AI Thinking" feel (keeping the UX from phase 9)
      await new Promise(resolve => setTimeout(resolve, 1500));

      res.json({
        fixedCode: parsed.fixedCode || html,
        explanation: parsed.explanation || "Accessibility improvements applied.",
        impact: parsed.impact || "Medium"
      });
    } catch (parseError: any) {
      console.error('JSON Parse Error:', parseError, 'Original text:', responseText);
      res.status(500).json({ 
        error: 'Failed to parse AI response', 
        message: parseError.message,
        raw: responseText 
      });
    }
  } catch (error: any) {
    console.error('Remediation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate remediation', 
      message: error.message || 'No error message provided',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      details: {
        name: error.name,
        message: error.message,
        status: error.status,
        code: error.code,
        ...(error.response ? { responseData: error.response.data } : {})
      }
    });
  }
});

export default router;
