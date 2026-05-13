import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createFixPR } from '../services/github';

const router = Router();

// Generate AI Remediation for a specific violation
router.post('/generate', async (req, res) => {
  const { html, violation, context } = req.body;
  
  const key = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();

  // Diagnostic: List available models
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`);
    const data = await response.json();
    console.log('--- Available Models for your NEWEST API Key ---');
    if (data.models) {
      data.models.forEach((m: any) => console.log(`- ${m.name.replace('models/', '')}`));
    } else {
      console.log('No models found or error:', JSON.stringify(data));
    }
    console.log('----------------------------------------------');
  } catch (e) {
    console.error('Failed to list models:', e);
  }

  console.log('--- Remediation Request Received ---');
  console.log('Violation:', violation);
  console.log('HTML Length:', html?.length || 0);

  if (!key) {
    console.error('API Key Missing');
    return res.status(401).json({ error: 'AI Engine Configuration Error', message: 'No Gemini API Key found in server environment.' });
  }

  if (!html || !violation) {
    console.error('Missing Required Fields');
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

    console.log('Calling Gemini API (with Fallback Logic)...');
    
    // List of models to try in order of likelihood to work
    const modelsToTry = [
      { name: 'gemini-2.5-flash-lite', version: 'v1beta' },
      { name: 'gemini-2.5-flash', version: 'v1beta' },
      { name: 'gemini-2.5-pro', version: 'v1beta' },
      { name: 'gemini-2.0-flash-lite-001', version: 'v1beta' },
      { name: 'gemini-2.0-flash-001', version: 'v1beta' }
    ];

    let lastError = null;
    let successResult = null;

    for (const modelConfig of modelsToTry) {
      try {
        console.log(`Trying model: ${modelConfig.name} (${modelConfig.version})...`);
        const apiResponse = await fetch(`https://generativelanguage.googleapis.com/${modelConfig.version}/models/${modelConfig.name}:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        if (apiResponse.ok) {
          successResult = await apiResponse.json();
          console.log(`Successfully generated with ${modelConfig.name}!`);
          break;
        } else {
          const errorData = await apiResponse.json();
          const errorMsg = errorData.error?.message || `Status ${apiResponse.status}`;
          console.warn(`${modelConfig.name} failed: ${errorMsg}`);
          lastError = errorMsg;
        }
      } catch (e: any) {
        console.error(`Fetch error for ${modelConfig.name}:`, e.message);
        lastError = e.message;
      }
    }

    if (!successResult) {
      throw new Error(`All Gemini models failed. Last error: ${lastError}`);
    }

    const responseText = successResult.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    console.log('Gemini Raw Response:', responseText);
    
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
      console.error('JSON Parse Error:', parseError.message);
      res.status(500).json({ 
        error: 'Failed to parse AI response', 
        message: parseError.message || 'Malformed JSON returned from AI',
        raw: responseText 
      });
    }
  } catch (error: any) {
    console.error('AI Generation Error:', error);
    
    // Create a safe serializable error object
    const errorDetails = {
      message: error?.message || String(error),
      name: error?.name || 'Error',
      code: error?.code,
      status: error?.status,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      raw: String(error)
    };

    res.status(500).json({ 
      error: 'Failed to generate remediation', 
      message: errorDetails.message,
      details: errorDetails
    });
  }
});

/**
 * @route POST /api/remediation/github/fix
 * @desc Create a GitHub PR for a specific violation
 */
router.post('/github/fix', async (req, res) => {
  try {
    const { userId, repoFullName, violation } = req.body;

    if (!userId || !repoFullName || !violation) {
      return res.status(400).json({ error: 'Missing required fields: userId, repoFullName, and violation are required.' });
    }

    const result = await createFixPR(userId, repoFullName, violation);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json({ error: result.error });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
