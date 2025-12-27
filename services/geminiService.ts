import { GoogleGenAI, Type } from "@google/genai";
import { Vulnerability, Severity } from "../types";

export const analyzeScanLogs = async (scanLogs: string[], target: string): Promise<{
  summary: string;
  vulnerabilities: Vulnerability[];
  securityScore: number;
}> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please configure the API_KEY environment variable.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const logsText = scanLogs.join('\n');
  const prompt = `
    ACT AS: A Senior Penetration Tester and Security Engineer.
    TASK: Analyze the network scan logs for target "${target}" and provide a remediation plan.
    
    LOGS:
    """
    ${logsText}
    """

    REQUIREMENTS:
    1. EXTRACT findings (vulnerabilities, open ports, leaks).
    2. ASSIGN a Security Score (0-100).
    3. FOR EACH VULNERABILITY:
       - Provide a technical description.
       - Provide a general remediation strategy.
       - **CRITICAL**: Generate a specific CODE SNIPPET or COMMAND LINE instruction to fix it. 
         (e.g., an iptables rule, a Nginx config line, a Python patch, or a Git command).

    OUTPUT FORMAT: JSON only.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "Executive summary." },
            securityScore: { type: Type.INTEGER, description: "0-100 Score." },
            vulnerabilities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  severity: { type: Type.STRING, enum: [Severity.CRITICAL, Severity.HIGH, Severity.MEDIUM, Severity.LOW, Severity.INFO] },
                  description: { type: Type.STRING },
                  remediation: { type: Type.STRING, description: "Human readable fix advice." },
                  codeFix: { type: Type.STRING, description: "Exact code/command to fix the issue (e.g. 'sudo systemctl stop telnet' or config block)." },
                },
                required: ["id", "name", "severity", "description", "remediation", "codeFix"],
              },
            },
          },
          required: ["summary", "securityScore", "vulnerabilities"],
        },
      },
    });

    const rawText = response.text || "{}";
    
    let jsonText = rawText;
    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
        jsonText = jsonMatch[1];
    } else {
        const firstBrace = rawText.indexOf('{');
        const lastBrace = rawText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            jsonText = rawText.substring(firstBrace, lastBrace + 1);
        }
    }

    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    throw new Error("Failed to parse AI analysis. The model response might be malformed or the API key is invalid.");
  }
};