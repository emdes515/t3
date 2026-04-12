import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

async function listModels() {
  if (!apiKey) {
    console.error("API Key missing");
    return;
  }
  const genAI = new GoogleGenAI({ apiKey });
  // Note: The new SDK @google/genai doesn't have a direct listModels top-level easy call like binary.
  // We'll try to just check if gemini-2.0-flash-lite works.
  console.log("Checking gemini-2.0-flash-lite-preview-02-05...");
  try {
    const model = genAI.models.get({ model: "gemini-2.0-flash-lite-preview-02-05" });
    console.log("Model reachable");
  } catch (e) {
    console.log("Model not reachable:", e.message);
  }
}

listModels();
