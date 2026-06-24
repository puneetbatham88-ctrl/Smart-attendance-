import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Safe lazy initializer for Gemini client
  let ai: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI {
    if (!ai) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is required');
      }
      ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return ai;
  }

  // AI-powered analytical endpoint
  app.post("/api/ai-analysis", async (req: any, res: any) => {
    try {
      const { logs, employees, shifts, prompt } = req.body;
      
      const contextPrompt = `
You are an expert HR Analyst and Staffing Optimizer.
Analyze the following active workforce attendance parameters and historic log files to draw constructive highlights:

CURRENT CUSTOM SHIFTS DEFINED:
${JSON.stringify(shifts, null, 2)}

CURRENT TEAM ROSTER:
${JSON.stringify(employees.map((e: any) => ({ name: e.name, email: e.email, defaultShiftId: e.defaultShiftId, status: e.status })), null, 2)}

RECORDS DATASET (LAST 5 DAYS):
${JSON.stringify(logs.map((l: any) => ({
  employee: l.userName,
  date: l.date,
  punchIn: l.punchInTime,
  punchOut: l.punchOutTime,
  shiftMatched: l.shiftName,
  status: l.status,
  locationIn: l.punchInLocation?.name,
  locationOut: l.punchOutLocation?.name,
  notes: l.notes
})), null, 2)}

HR REQUIREMENT:
"${prompt || "Generate a summary overview of attendance trends, highlight anomalies (like lateness, coordinate boundary failure/out-of-bounds punching), and provide roster-fixing actionable tips."}"

Please output a beautifully-formatted, concise response with:
1. **Attendance KPI Highlights** (Overall compliance numbers vs late punch ratios)
2. **Flagged Anomalies / Geo-fence Warnings** (Detailing items with "Out of Bounds" or late entries)
3. **Actionable Scheduling Recommendations** (Optimal shifts, DND suppression stats, or personnel adjustments)

Do NOT write heading 1 markdown elements. Keep output very elite, readable, and highly informative for HR administrators. Always communicate in a professional, constructive manner.
`;

      const client = getGeminiClient();
      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contextPrompt,
        config: {
          temperature: 0.2,
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini Proxy Error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze attendance statistics with Gemini AI" });
    }
  });

  // AI-powered weekly analytics insights endpoint returning structured JSON
  app.post("/api/ai-weekly-analytics", async (req: any, res: any) => {
    try {
      const { logs, employees, shifts, lateArrivalsTrend, hourlyOccupancy } = req.body;
      
      const contextPrompt = `
You are an advanced HR Operations & Workplace Intelligence Analyst.
Analyze the following workforce biometric punch logs data, weekly late arrival trends, and hourly office occupancy distribution to generate deep, actionable weekly summary insights.

WORKFORCE METRICS SUMMARY:
- Total Employees: ${employees ? employees.length : 0}
- Total Punch Logs: ${logs ? logs.length : 0}

LATE ARRIVALS TREND (LAST 7 DAYS):
${JSON.stringify(lateArrivalsTrend, null, 2)}

HOURLY OFFICE OCCUPANCY PROFILE (24-HOUR CLOCK):
${JSON.stringify(hourlyOccupancy, null, 2)}

SHIFT DEFINITIONS:
${JSON.stringify(shifts, null, 2)}

Please generate a professional, highly readable and actionable 3-part report. Use the following structured JSON format:
{
  "summary": "A 2-3 sentence strategic executive summary of overall attendance compliance and workplace state.",
  "lateArrivalsAnalysis": "A deep-dive analysis explaining the trends or factors causing late arrivals based on the 7-day trend (e.g. specific days or shifts with highest lateness, and likely real-world reasons). Give actionable staffing optimization recommendations.",
  "occupancyInsights": "An insightful analysis of the hourly office occupancy (e.g., peak office density times, low-traffic slots, and suggestions for hybrid work or staggered schedules to balance office resource load).",
  "recommendations": [
    "Staffing recommendation 1 (e.g. stagger morning shift start time to alleviate 09:00 traffic)",
    "Staffing recommendation 2 (e.g. audit high late-ratio personnel or shift hours)",
    "Staffing recommendation 3 (e.g. enable remote work flexibility during peak occupancy hours)"
  ]
}

Ensure the response is STRICTLY valid, well-formed JSON matching the schema above. Do not output markdown, preambles, or postambles outside the JSON. Return only the JSON content.
`;

      const client = getGeminiClient();
      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contextPrompt,
        config: {
          temperature: 0.2,
          responseMimeType: "application/json",
        }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (error: any) {
      console.error("Gemini Weekly Analytics Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate weekly summary insights" });
    }
  });

  // Hot module replacement works via Vite middleware in dev
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server starting on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
