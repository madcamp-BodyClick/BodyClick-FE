import { NextResponse } from "next/server";

type IntakePayload = {
  ageRange?: string;
  sex?: string;
  mainSymptom: string;
  duration: string;
  severity?: string;
  associatedSymptoms?: string[];
  redFlags?: string[];
};

type SafetyPayload = {
  emergency: boolean;
  reasons: string[];
};

type Specialty =
  | "cardio"
  | "vascular"
  | "ortho"
  | "resp"
  | "gi"
  | "neuro"
  | "derm";

type RouterPayload = {
  specialty: Specialty;
  confidence: number;
  reasoning: string;
};

type SpecialistPayload = {
  possibleCauses: {
    category: "infectious" | "inflammatory" | "structural" | "vascular" | "other";
    examples: string[];
  }[];
  whenToSeekCare: string[];
  recommendedCare: string;
  followUpQuestions: string[];
  disclaimer: string;
};

type ConsultResponse = {
  emergency: boolean;
  specialty: Specialty | null;
  specialist: SpecialistPayload | null;
};

const GEMINI_MODEL = "gemini-1.5-flash";

function getGeminiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("Missing GEMINI_API_KEY");
  }
  return key;
}

async function callGeminiJSON<T>(systemPrompt: string, userMessage: string): Promise<T> {
  const key = getGeminiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        { role: "system", parts: [{ text: systemPrompt }] },
        { role: "user", parts: [{ text: userMessage }] },
      ],
      generationConfig: {
        temperature: 0.2,
        response_mime_type: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini error: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini response missing text");
  }

  // Enforce strict JSON output to avoid free-text leakage.
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`Invalid JSON from Gemini: ${(error as Error).message}`);
  }
}

async function intakeAgent(message: string): Promise<IntakePayload> {
  const prompt = [
    "You are the Intake Agent for a medical decision-support service.",
    "Convert the user's symptom text into structured JSON only.",
    "Do NOT diagnose or prescribe. Use neutral language.",
    "Schema:",
    "{",
    '  "ageRange"?: "child|teen|adult|older adult",',
    '  "sex"?: "female|male",',
    '  "mainSymptom": string,',
    '  "duration": string,',
    '  "severity"?: "mild|moderate|severe|unknown",',
    '  "associatedSymptoms"?: string[],',
    '  "redFlags"?: string[]',
    "}",
    "Return ONLY valid JSON. No extra text.",
  ].join("\n");

  return callGeminiJSON<IntakePayload>(prompt, message);
}

async function safetyAgent(intake: IntakePayload): Promise<SafetyPayload> {
  const prompt = [
    "You are the Safety / Red-Flag Agent.",
    "Given the intake JSON, decide if this is potentially emergent.",
    "Output JSON only: { \"emergency\": boolean, \"reasons\": string[] }",
    "Be conservative about safety. Do NOT diagnose or prescribe.",
    "Return ONLY valid JSON. No extra text.",
  ].join("\n");

  return callGeminiJSON<SafetyPayload>(prompt, JSON.stringify(intake));
}

async function routerAgent(intake: IntakePayload): Promise<RouterPayload> {
  const prompt = [
    "You are the Router Agent.",
    "Choose exactly one specialty from: [\"cardio\", \"vascular\", \"ortho\", \"resp\", \"gi\", \"neuro\", \"derm\"].",
    "Output JSON only: { \"specialty\": string, \"confidence\": number, \"reasoning\": string }",
    "Confidence is 0 to 1. Reasoning is brief.",
    "Do NOT diagnose or prescribe.",
    "Return ONLY valid JSON. No extra text.",
  ].join("\n");

  return callGeminiJSON<RouterPayload>(prompt, JSON.stringify(intake));
}

function buildSpecialistPrompt(roleName: string, focusNotes: string[]): string {
  return [
    `You are the ${roleName} Specialist Agent.`,
    "Provide decision-support information only, not a diagnosis.",
    "Output JSON only with fields:",
    "{",
    '  "possibleCauses": [',
    "    {",
    '      "category": "infectious|inflammatory|structural|vascular|other",',
    '      "examples": string[]',
    "    }",
    "  ],",
    '  "whenToSeekCare": string[],',
    '  "recommendedCare": string,',
    '  "followUpQuestions": string[],',
    '  "disclaimer": string',
    "}",
    "Include a clear medical safety disclaimer in disclaimer.",
    "Use cautious phrasing: \"may be\", \"possible\", \"not a diagnosis\".",
    "Specialty focus:",
    ...focusNotes,
    "Return ONLY valid JSON. No extra text.",
  ].join("\n");
}

async function cardioAgent(intake: IntakePayload): Promise<SpecialistPayload> {
  const prompt = buildSpecialistPrompt("Cardiology", [
    "- Emphasize chest pain, shortness of breath, palpitations, syncope, leg swelling.",
    "- Include warning signs such as crushing chest pain, fainting, new severe shortness of breath.",
    "- Mention emergency care for suspected heart attack or stroke-like symptoms.",
  ]);
  return callGeminiJSON<SpecialistPayload>(prompt, JSON.stringify(intake));
}

async function vascularAgent(intake: IntakePayload): Promise<SpecialistPayload> {
  const prompt = buildSpecialistPrompt("Vascular Surgery", [
    "- Emphasize limb pain/swelling, color changes, coldness, ulcers, sudden weakness.",
    "- Include red flags like sudden limb ischemia, severe calf swelling, uncontrolled bleeding.",
    "- Mention emergency care for suspected DVT/PE signs or acute limb ischemia.",
  ]);
  return callGeminiJSON<SpecialistPayload>(prompt, JSON.stringify(intake));
}

async function orthoAgent(intake: IntakePayload): Promise<SpecialistPayload> {
  const prompt = buildSpecialistPrompt("Orthopedics", [
    "- Emphasize trauma, joint pain, back pain, weakness, limited range of motion.",
    "- Include red flags like open fractures, loss of bowel/bladder control, severe trauma.",
    "- Suggest urgent care for severe injury, deformity, or neuro deficits.",
  ]);
  return callGeminiJSON<SpecialistPayload>(prompt, JSON.stringify(intake));
}

async function respAgent(intake: IntakePayload): Promise<SpecialistPayload> {
  const prompt = buildSpecialistPrompt("Respiratory Medicine", [
    "- Emphasize cough, wheeze, shortness of breath, chest tightness, fever.",
    "- Include red flags like severe breathlessness, blue lips, confusion, high fever.",
    "- Mention emergency care for sudden severe breathing difficulty or chest pain with dyspnea.",
  ]);
  return callGeminiJSON<SpecialistPayload>(prompt, JSON.stringify(intake));
}

async function giAgent(intake: IntakePayload): Promise<SpecialistPayload> {
  const prompt = buildSpecialistPrompt("Gastroenterology", [
    "- Emphasize abdominal pain, nausea/vomiting, diarrhea/constipation, GI bleeding.",
    "- Include pancreas-related possibilities for upper abdominal pain radiating to back, fatty food intolerance, jaundice.",
    "- Mention warning signs like persistent vomiting, black/tarry stools, blood in vomit, severe abdominal pain.",
  ]);
  return callGeminiJSON<SpecialistPayload>(prompt, JSON.stringify(intake));
}

async function neuroAgent(intake: IntakePayload): Promise<SpecialistPayload> {
  const prompt = buildSpecialistPrompt("Neurology", [
    "- Emphasize headache, dizziness, weakness, numbness, seizures, vision changes.",
    "- Include red flags like sudden severe headache, one-sided weakness, slurred speech.",
    "- Mention emergency care for stroke-like symptoms or new seizures.",
  ]);
  return callGeminiJSON<SpecialistPayload>(prompt, JSON.stringify(intake));
}

async function dermAgent(intake: IntakePayload): Promise<SpecialistPayload> {
  const prompt = buildSpecialistPrompt("Dermatology", [
    "- Emphasize rashes, itching, sores, color changes, moles, infection signs.",
    "- Include warning signs like rapidly spreading rash, blistering, mucosal involvement.",
    "- Suggest urgent care for severe allergic reactions or skin infection with fever.",
  ]);
  return callGeminiJSON<SpecialistPayload>(prompt, JSON.stringify(intake));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message?: string };
    if (!body?.message || typeof body.message !== "string") {
      return NextResponse.json(
        { error: "Missing required field: message" },
        { status: 400 }
      );
    }

    const intake = await intakeAgent(body.message);
    const safety = await safetyAgent(intake);

    if (safety.emergency) {
      // If emergency, stop routing and specialist advice to avoid delay or false reassurance.
      const response: ConsultResponse = {
        emergency: true,
        specialty: null,
        specialist: null,
      };
      return NextResponse.json(response, { status: 200 });
    }

    const router = await routerAgent(intake);

    let specialist: SpecialistPayload;
    switch (router.specialty) {
      case "cardio":
        specialist = await cardioAgent(intake);
        break;
      case "vascular":
        specialist = await vascularAgent(intake);
        break;
      case "ortho":
        specialist = await orthoAgent(intake);
        break;
      case "resp":
        specialist = await respAgent(intake);
        break;
      case "gi":
        specialist = await giAgent(intake);
        break;
      case "neuro":
        specialist = await neuroAgent(intake);
        break;
      case "derm":
      default:
        specialist = await dermAgent(intake);
        break;
    }
    const response: ConsultResponse = {
      emergency: false,
      specialty: router.specialty,
      specialist,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
