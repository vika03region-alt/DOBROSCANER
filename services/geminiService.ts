import { GoogleGenAI, Type } from "@google/genai";
import { Vulnerability, Severity } from "../types";

export const analyzeScanLogs = async (scanLogs: string[], target: string): Promise<{
  summary: string;
  vulnerabilities: Vulnerability[];
  securityScore: number;
}> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const logsText = scanLogs.join('\n');
  const prompt = `
    ACT AS: A Senior Penetration Tester and Security Auditor.
    TASK: Analyze the following network scan output for the target "${target}".
    CONTEXT: These logs are from an automated security scanner.

    LOGS:
    """
    ${logsText}
    """

    REQUIREMENTS:
    1. EXTRACT real technical findings from the logs (ports, services, CVEs, vulnerabilities).
    2. IGNORE generic info logs unless relevant to security posture.
    3. ASSIGN a realistic Security Score (0-100).
       - < 40: Critical issues (SQLi, RCE).
       - 40-70: Major config issues or outdated services.
       - > 70: Good hygiene, minor info leaks.
    4. GENERATE actionable remediation steps for developers.

    OUTPUT FORMAT: JSON only, strictly adhering to the schema.
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
            summary: { type: Type.STRING, description: "Executive summary of the security posture." },
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
                  remediation: { type: Type.STRING },
                },
                required: ["id", "name", "severity", "description", "remediation"],
              },
            },
          },
          required: ["summary", "securityScore", "vulnerabilities"],
        },
      },
    });

    const rawText = response.text || "{}";
    
    // Clean markdown formatting if present (e.g. ```json ... ```)
    const jsonText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');

    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    throw new Error("Failed to parse AI analysis. Please try again.");
  }
};