import express from "express";
import multer from "multer";
import fs from "fs";
import pdf from "pdf-parse";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();
const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Gemini setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// PDF upload setup
const upload = multer({ dest: "uploads/" });

// YouTube summarization route
app.post("/summarize-youtube", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing YouTube URL" });

  try {
    const prompt = `Summarize this YouTube video: ${url}`;
    const result = await model.generateContent(prompt);
    const summary = result.response.text();
    res.json({ summary });
  } catch (err) {
    console.error("YouTube summarization error:", err);
    res.status(500).json({ error: "Failed to summarize YouTube video" });
  }
});

// PDF summarization route
app.post("/summarize-pdf", upload.single("file"), async (req, res) => {
  const filePath = req.file?.path;
  if (!filePath) return res.status(400).json({ error: "No PDF uploaded" });

  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdf(dataBuffer);
    const prompt = `Summarize this PDF content:\n\n${pdfData.text}`;
    const result = await model.generateContent(prompt);
    const summary = result.response.text();
    res.json({ summary });
  } catch (err) {
    console.error("PDF summarization error:", err);
    res.status(500).json({ error: "Failed to summarize PDF" });
  } finally {
    fs.unlinkSync(filePath); // Clean up uploaded file
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://127.0.0.1:${PORT}`);
});
