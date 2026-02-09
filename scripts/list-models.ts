const path = require('path');
const dotenv = require('dotenv');

// Load .env.local using dotenv
const result = dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (result.error) {
  console.error("Error loading .env.local with dotenv:", result.error);
}

async function listModels() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.error("Error: GOOGLE_GENERATIVE_AI_API_KEY not found in .env.local");
    // Debug: print keys loaded
    console.log("Loaded keys:", Object.keys(process.env).filter(k => k.startsWith("GOOGLE")));
    return;
  }

  console.log(`Using API Key: ${apiKey.substring(0, 5)}...`);

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error(text);
      return;
    }

    const data = await response.json();
    if (data.models) {
      console.log("\n--- Available Gemini Models ---");
      data.models.forEach((m: { name: string }) => {
        // Log basic info
        console.log(`- ${m.name.replace("models/", "")}`);
      });
    } else {
      console.log("No models found.");
    }

  } catch (error) {
    console.error("Fetch error:", error);
  }
}

listModels();
