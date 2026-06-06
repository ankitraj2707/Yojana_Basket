/**
 * main server file (e.g. index.js / server.js)
 * Fully compatible with Node.js and CommonJS (require syntax).
 */
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

// FIXED: Changed imports from 'api' to 'prisma' to match downstream database query calls
const prisma = require("./config/prisma");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// FIXED: Safety fallback middleware to guarantee req.body is an object inside all endpoints
app.use((req, res, next) => {
  if (!req.body) {
    req.body = {};
  }
  next();
});

// FIXED: Adaptive loader looking for 'schemes.json' in multiple relative locations
let SCHEMES_DATA = [];
try {
  const possiblePaths = [
    path.join(__dirname, "src/data/schemes.json"),
    path.join(__dirname, "schemes.json"),
    path.join(process.cwd(), "src/data/schemes.json"),
    path.join(process.cwd(), "schemes.json"),
  ];
  let loaded = false;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      SCHEMES_DATA = JSON.parse(fs.readFileSync(p, "utf8"));
      loaded = true;
      break;
    }
  }
  if (loaded) {
    console.log(
      `[YojanaBasket] Successfully loaded ${SCHEMES_DATA.length} local schemes from JSON!`,
    );
  } else {
    console.warn(
      "[YojanaBasket Warning] schemes.json was not found. Initializing empty schemes catalog.",
    );
  }
} catch (error) {
  console.error("Error reading schemes.json file:", error);
}

// -------------------------------------------------------------
// REST API ENDPOINTS
// -------------------------------------------------------------

// Serve global schemes list
app.get("/api/schemes", (req, res) => {
  const { category, search } = req.query;
  let filtered = [...SCHEMES_DATA];

  if (category && category !== "all") {
    filtered = filtered.filter(
      (s) => s.category === String(category).toLowerCase(),
    );
  }

  if (search) {
    const query = String(search).toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        (s.hindiName && s.hindiName.includes(query)) ||
        s.description.toLowerCase().includes(query) ||
        s.ministry.toLowerCase().includes(query),
    );
  }

  res.json({ schemes: filtered });
});

// AI Assistant endpoint using Gemini 3.5-flash with Search Grounding
app.post("/api/assistant/chat", async (req, res) => {
  const { messages, userProfile } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array is required." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    console.warn(
      "GEMINI_API_KEY is not configured. Falling back to rule-based assistance.",
    );

    // Perform simple rule-based scheme match for offline demo
    const lastUserMessage =
      messages[messages.length - 1]?.content?.toLowerCase() || "";
    let matchedKeywords = [];

    if (
      lastUserMessage.includes("farmer") ||
      lastUserMessage.includes("agriculture") ||
      lastUserMessage.includes("kisan") ||
      lastUserMessage.includes("land")
    ) {
      matchedKeywords.push("PM-KISAN");
    }
    if (
      lastUserMessage.includes("health") ||
      lastUserMessage.includes("hospital") ||
      lastUserMessage.includes("medical") ||
      lastUserMessage.includes("ayushman") ||
      lastUserMessage.includes("card")
    ) {
      matchedKeywords.push("Ayushman Bharat (PM-JAY)");
    }
    if (
      lastUserMessage.includes("loan") ||
      lastUserMessage.includes("business") ||
      lastUserMessage.includes("capital") ||
      lastUserMessage.includes("mudra")
    ) {
      matchedKeywords.push("Pradhan Mantri MUDRA Yojana");
    }
    if (
      lastUserMessage.includes("daughter") ||
      lastUserMessage.includes("girl") ||
      lastUserMessage.includes("sukanya") ||
      lastUserMessage.includes("child")
    ) {
      matchedKeywords.push("Sukanya Samriddhi Yojana");
    }
    if (
      lastUserMessage.includes("house") ||
      lastUserMessage.includes("home") ||
      lastUserMessage.includes("awas") ||
      lastUserMessage.includes("rent")
    ) {
      matchedKeywords.push("Pradhan Mantri Awas Yojana (PMAY)");
    }

    let responseText =
      "### Namaste 🙏 I am Yojana Mitra, your schemes assistant.\n\n";
    responseText +=
      "Currently, I am running in **Demo Mode** because the `GEMINI_API_KEY` is not set in the workspace Secrets panel.\n\n";

    if (matchedKeywords.length > 0) {
      responseText += `Based on your request, I identified keyword matches with: **${matchedKeywords.join(" and ")}**!\n\n`;
      responseText += "Here is some quick guidance:\n";
      matchedKeywords.forEach((schemeName) => {
        const sch = SCHEMES_DATA.find((s) =>
          s.name.includes(schemeName.split(" ")[0]),
        );
        if (sch) {
          responseText += `- **${sch.name}** (${sch.hindiName}): Provide benefits like ${sch.benefits}. You can apply by supplying documents including: *${sch.requiredDocuments.slice(0, 2).join(", ")}*.\n`;
        }
      });
      responseText +=
        "\nTo save this scheme into your personal dashboard, click the 'Add to Basket' button on the schemes directory card.";
    } else {
      responseText +=
        "Tell me a bit about yourself or ask a direct question (e.g. *'I am a farmer, what schemes can I get?'* or *'How can I get assistance for a child education?'*).\n\n";
      responseText +=
        "I am fully ready to matching you! Please configure your **GEMINI_API_KEY** in the Secrets panel of your AI Studio workspace to toggle my live AI intelligence, which supports deep analysis and Google Search grounding.";
    }

    return res.json({
      text: responseText,
      groundingSources: [],
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    let profileContext = "";
    if (userProfile) {
      profileContext = `
The current citizen's questionnaire state is:
- Name: ${userProfile.name || "Citizen"}
- Age: ${userProfile.age || "Not specified"}
- Gender: ${userProfile.gender || "Not specified"}
- State: ${userProfile.state || "Not specified"}
- Caste/Category: ${userProfile.caste || "Not specified"}
- Annual Income: ₹${userProfile.annualIncome || "Not specified"}
- Occupation: ${userProfile.occupation || "Not specified"}
- Physically Disabled: ${userProfile.disability ? "Yes (40% or more)" : "No"}
`;
    }

    const prompt = `
You are Yojana Mitra, the elite AI-powered Official Schemes Assistant on YojanaBasket.
Your primary role is to help citizens discover, qualify for, and understand Indian central & state government schemes.

${profileContext}

Our local YojanaBasket schemes database contains:
${JSON.stringify(SCHEMES_DATA, null, 2)}

User asks:
"${messages[messages.length - 1]?.content}"

Guidelines:
1. First, check if the query matches or is answered by any local scheme in our database above. If so, explain it in detail, referencing its benefits, conditions, and required documents.
2. If the user asks about an external scheme or needs real-time up-to-date inputs (like latest interest rates or newly launched schemes), rely on Google Search Grounding to find correct information.
3. Keep your tone polite, formal, clear, and encouraging.
4. Output beautifully structured Markdown with bullet points, brief bold highlights, or tables where appropriate to represent age/income parameters.
5. Do not invent details; verify facts using search grounding. Reference your grounding links.
6. Urge them to click "Add to Basket" or use our "Eligibility Calculator" tab to test match boundaries easily.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.7,
      },
    });

    const text =
      response.text ||
      "I was unable to formulate a response. Please try asking again.";
    const groundingChunks =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .map((chunk) => {
        return {
          title: chunk.web?.title || "Search Reference",
          uri: chunk.web?.uri || "",
        };
      })
      .filter((s) => s.uri !== "");

    res.json({
      text,
      groundingSources: sources,
    });
  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({
      error: "Failed to communicate with AI model.",
      details: error.message,
    });
  }
});

// --- DATABASE SEEDING ENGINE ---
async function seedDefaultData() {
  try {
    console.log("Checking and seeding default database records...");

    // Seed default user for Ankit Kumar
    const defaultUser = await prisma.userProfile.upsert({
      where: { email: "krankit2007@gmail.com" },
      update: {},
      create: {
        id: "seeded-user-id-ankit-2026",
        name: "Ankit Kumar",
        email: "krankit2007@gmail.com",
        age: 25,
        gender: "Male",
        state: "Bihar",
        caste: "OBC",
        annualIncome: 150000,
        occupation: "Student",
        disability: false,
        avatarUrl: "",
      },
    });

    // Seed default saved scheme
    await prisma.savedScheme.upsert({
      where: {
        userId_schemeId: {
          userId: defaultUser.id,
          schemeId: "pm-kisan",
        },
      },
      update: {},
      create: {
        id: "bookmark-example-id-1",
        userId: defaultUser.id,
        schemeId: "pm-kisan",
        savedAt: new Date(),
      },
    });

    // Seed default tracked applications
    await prisma.trackedApplication.upsert({
      where: {
        userId_schemeId: {
          userId: defaultUser.id,
          schemeId: "pm-jay",
        },
      },
      update: {},
      create: {
        id: "tracker-example-id-1",
        userId: defaultUser.id,
        schemeId: "pm-jay",
        status: "Applied",
        applicationRef: "YB-2026-883491",
        remarks: "Seeded system test data direct from Prisma.",
      },
    });

    // Seed default document row
    const docExists = await prisma.userDocument.findFirst({
      where: { userId: defaultUser.id, docType: "Aadhaar Card" },
    });
    if (!docExists) {
      await prisma.userDocument.create({
        data: {
          id: "doc-example-id-1",
          userId: defaultUser.id,
          docType: "Aadhaar Card",
          fileName: "ankit_aadhaar_masked.pdf",
          fileSize: "1.2 MB",
          docUrl: "#",
        },
      });
    }

    // Seed default feedback row
    await prisma.schemeFeedback.upsert({
      where: {
        userId_schemeId: {
          userId: defaultUser.id,
          schemeId: "pm-kisan",
        },
      },
      update: {},
      create: {
        id: "feedback-example-id-1",
        userId: defaultUser.id,
        schemeId: "pm-kisan",
        rating: 5,
        comments: "Excellent benefit delivery to farmers directly in Bihar!",
      },
    });

    console.log("Database seeded successfully with Prisma!");
  } catch (err) {
    console.warn("Database seeding non-blocking warning:", err);
  }
}

// Ensure default seeds are ran on startup
seedDefaultData().catch((err) => console.error("Initial seeding failed:", err));

// --- DB ENDPOINTS ---

// DB health status
app.get("/api/db/status", async (req, res) => {
  try {
    const counts = {
      profiles: await prisma.userProfile.count(),
      basketItems: await prisma.savedScheme.count(),
      applications: await prisma.trackedApplication.count(),
      documents: await prisma.userDocument.count(),
      feedbacks: await prisma.schemeFeedback.count(),
    };
    res.json({
      status: "connected",
      database: "PostgreSQL",
      orm: "Prisma Client",
      counts,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to connect to database via Prisma",
      details: error.message,
    });
  }
});

// GET Profiles
app.get("/api/profiles", async (req, res) => {
  try {
    const profiles = await prisma.userProfile.findMany({
      include: {
        savedSchemes: true,
        applications: true,
        documents: true,
        feedbacks: true,
      },
    });
    res.json({ profiles });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Prisma query failed", details: error.message });
  }
});

// GET Profile by Email
app.get("/api/profiles/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const profile = await prisma.userProfile.findUnique({
      where: { email },
      include: {
        savedSchemes: true,
        applications: true,
        documents: true,
        feedbacks: true,
      },
    });

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json({ profile });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Prisma query failed", details: error.message });
  }
});

// POST Profile (Upsert)
app.post("/api/profiles", async (req, res) => {
  try {
    const {
      email,
      name,
      age,
      gender,
      state,
      caste,
      annualIncome,
      occupation,
      disability,
    } = req.body;
    if (!email || !name) {
      return res
        .status(400)
        .json({ error: "Email and Name are required keys." });
    }

    const profile = await prisma.userProfile.upsert({
      where: { email },
      update: {
        name,
        age: age ? parseInt(age) : null,
        gender,
        state,
        caste,
        annualIncome: annualIncome ? parseFloat(annualIncome) : null,
        occupation,
        disability: disability === true || disability === "true",
      },
      create: {
        name,
        email,
        age: age ? parseInt(age) : null,
        gender,
        state,
        caste,
        annualIncome: annualIncome ? parseFloat(annualIncome) : null,
        occupation,
        disability: disability === true || disability === "true",
        avatarUrl: "",
      },
    });

    res
      .status(201)
      .json({ message: "Profile saved successfully via Prisma", profile });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Prisma upsert failed", details: error.message });
  }
});

// GET Basket list (Saved Schemes)
app.get("/api/basket", async (req, res) => {
  try {
    const { userId } = req.query;
    const items = await prisma.savedScheme.findMany({
      where: userId ? { userId: String(userId) } : {},
    });
    res.json({ savedSchemes: items });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Prisma query failed", details: error.message });
  }
});

// POST Basket save
app.post("/api/basket", async (req, res) => {
  try {
    const { userId, schemeId } = req.body;
    if (!userId || !schemeId) {
      return res
        .status(400)
        .json({ error: "userId and schemeId are required keys." });
    }

    const item = await prisma.savedScheme.upsert({
      where: {
        userId_schemeId: { userId, schemeId },
      },
      update: {},
      create: {
        userId,
        schemeId,
      },
    });

    res.status(201).json({
      message: "Scheme bookmarked in database via Prisma",
      savedScheme: item,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Prisma write failed", details: error.message });
  }
});

// DELETE Basket save
app.delete("/api/basket", async (req, res) => {
  try {
    const { userId, schemeId } = req.body;
    if (!userId || !schemeId) {
      return res
        .status(400)
        .json({ error: "userId and schemeId are required keys." });
    }

    await prisma.savedScheme.delete({
      where: {
        userId_schemeId: { userId, schemeId },
      },
    });

    res.json({ message: "Bookmark removed from database via Prisma" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Prisma delete failed", details: error.message });
  }
});

// GET Applications list
app.get("/api/applications", async (req, res) => {
  try {
    const { userId } = req.query;
    const apps = await prisma.trackedApplication.findMany({
      where: userId ? { userId: String(userId) } : {},
    });
    res.json({ applications: apps });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Prisma query failed", details: error.message });
  }
});

// POST Applications track
app.post("/api/applications", async (req, res) => {
  try {
    const { userId, schemeId, status } = req.body;
    if (!userId || !schemeId) {
      return res
        .status(400)
        .json({ error: "userId and schemeId are required keys." });
    }

    const trackingNum = `YB-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const appItem = await prisma.trackedApplication.upsert({
      where: {
        userId_schemeId: { userId, schemeId },
      },
      update: status ? { status } : {},
      create: {
        userId,
        schemeId,
        status: status || "Applied",
        applicationRef: trackingNum,
        remarks: "Digitally tracked application created via REST API.",
      },
    });

    res.status(201).json({
      message: "Application tracked in database via Prisma",
      application: appItem,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Prisma write failed", details: error.message });
  }
});

// PATCH Application Status
app.patch("/api/applications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!status) {
      return res.status(400).json({ error: "status is required." });
    }

    const updated = await prisma.trackedApplication.update({
      where: { id },
      data: {
        status,
        remarks: remarks || undefined,
      },
    });

    res.json({
      message: "Application status updated in database via Prisma",
      application: updated,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Prisma update failed", details: error.message });
  }
});

// DELETE Application
app.delete("/api/applications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.trackedApplication.delete({
      where: { id },
    });
    res.json({
      message: "Application tracking deleted from database via Prisma",
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Prisma delete failed", details: error.message });
  }
});

// GET Documents
app.get("/api/documents", async (req, res) => {
  try {
    const { userId } = req.query;
    const docs = await prisma.userDocument.findMany({
      where: userId ? { userId: String(userId) } : {},
    });
    res.json({ documents: docs });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Prisma query failed", details: error.message });
  }
});

// POST Documents
app.post("/api/documents", async (req, res) => {
  try {
    const { userId, docType, fileName, fileSize } = req.body;
    if (!userId || !docType || !fileName || !fileSize) {
      return res.status(400).json({
        error: "userId, docType, fileName, and fileSize are required.",
      });
    }

    const doc = await prisma.userDocument.create({
      data: {
        userId,
        docType,
        fileName,
        fileSize,
        docUrl: "#",
      },
    });

    res.status(201).json({
      message: "Document tracked in database via Prisma",
      document: doc,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Prisma write failed", details: error.message });
  }
});

// DELETE Document
app.delete("/api/documents/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.userDocument.delete({
      where: { id },
    });
    res.json({ message: "Document removed from database via Prisma" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Prisma delete failed", details: error.message });
  }
});

// GET Feedbacks
app.get("/api/feedbacks", async (req, res) => {
  try {
    const { schemeId } = req.query;
    const list = await prisma.schemeFeedback.findMany({
      where: schemeId ? { schemeId: String(schemeId) } : {},
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });
    res.json({ feedbacks: list });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Prisma query failed", details: error.message });
  }
});

// POST Feedback (Upsert)
app.post("/api/feedbacks", async (req, res) => {
  try {
    const { userId, schemeId, rating, comments } = req.body;
    if (!userId || !schemeId || rating === undefined) {
      return res.status(400).json({
        error: "userId, schemeId, and rating (1-5) are required keys.",
      });
    }

    const rNum = parseInt(rating);
    if (rNum < 1 || rNum > 5) {
      return res
        .status(400)
        .json({ error: "Rating must be an integer between 1 and 5." });
    }

    const fb = await prisma.schemeFeedback.upsert({
      where: {
        userId_schemeId: { userId, schemeId },
      },
      update: {
        rating: rNum,
        comments,
      },
      create: {
        userId,
        schemeId,
        rating: rNum,
        comments,
      },
    });

    res.status(201).json({
      message: "Feedback saved and recorded via Prisma",
      feedback: fb,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Prisma feedback upsert failed", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
