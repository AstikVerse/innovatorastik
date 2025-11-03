import express from "express";
import multer from "multer";
import fs from "fs";
import pdf from "pdf-parse";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { YoutubeTranscript } from "youtube-transcript";
import cors from "cors";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ dest: "uploads/" });
const PORT = process.env.PORT || 3001;

// ✅ Allow frontend access
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.static(__dirname));
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 📄 PDF Summarizer
app.post("/summarize-pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const dataBuffer = fs.readFileSync(req.file.path);
    const text = await pdf(dataBuffer);

    if (!text.text)
      return res.status(400).json({ error: "Could not extract text from PDF" });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Summarize this PDF content in short, clear bullet points:\n\n${text.text}`;
    const result = await model.generateContent(prompt);

    res.json({ summary: result.response.text() });
    fs.unlinkSync(req.file.path);
  } catch (err) {
    console.error("PDF summarization error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 🎥 YouTube Summarizer
app.post("/summarize-youtube", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Missing YouTube URL" });

    const videoId = new URL(url).searchParams.get("v");
    if (!videoId)
      return res.status(400).json({ error: "Invalid YouTube URL format" });

    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    if (!transcript || transcript.length === 0)
      return res.status(400).json({ error: "No transcript available" });

    const text = transcript.map((t) => t.text).join(" ");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Summarize this YouTube video transcript in short, clear bullet points:\n\n${text}`;
    const result = await model.generateContent(prompt);

    res.json({ summary: result.response.text() });
  } catch (err) {
    console.error("YouTube summarization error:", err.message);
    res.status(500).json({ error: "Failed to summarize YouTube video." });
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
