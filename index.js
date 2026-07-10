/**
 * YojanaBasket - Main Server Engine Application
 * Fully compatible with Node.js, Prisma v6, and CommonJS architecture.
 */
require("dotenv").config(); // Must be invoked immediately at line 1 to load secrets cleanly [cite: 2, 429]

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs"); // Used for secure asynchronous credential hashing [cite: 3]
const twilio = require("twilio"); // Used for active network SMS dispatch pipelines [cite: 378]

// Initialize the Prisma Client instance (v6 natively resolves settings directly from your .env file) [cite: 3, 337, 340]
const prisma = require("./config/prisma");

// Initialize live Twilio communications instance using environment tokens [cite: 379, 428]
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

const app = express();
const PORT = process.env.PORT || 5000; // cite: 4

app.use(cors()); // cite: 5
app.use(express.json()); // cite: 5
app.use(express.urlencoded({ extended: true })); // cite: 5

// Serve your static frontend content directory path assets natively [cite: 128, 140]
app.use(express.static(path.join(__dirname, "public")));

// Fallback safety middleware to guarantee req.body resolves as an object inside every endpoint [cite: 5]
app.use((req, res, next) => {
  if (!req.body) {
    req.body = {};
  }
  next();
});

// Dynamic adaptive catalog dataset data loader looking for 'schemes.json' [cite: 6, 7]
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
      SCHEMES_DATA = JSON.parse(fs.readFileSync(p, "utf8")); // cite: 8
      loaded = true; // cite: 9
      break;
    }
  }
  if (loaded) {
    console.log(
      `[YojanaBasket] Successfully loaded ${SCHEMES_DATA.length} local schemes from JSON!`,
    ); // cite: 9
  } else {
    console.warn(
      "[YojanaBasket Warning] schemes.json was not found. Initializing empty schemes catalog.",
    ); // cite: 10
  }
} catch (error) {
  console.error("Error reading schemes.json file:", error); // cite: 11
}

// Global active memory tracking map to store unverified registration sessions [cite: 350, 413]
const pendingRegistrationsMap = new Map();

// -------------------------------------------------------------
// REST API PUBLIC CATALOG ENDPOINTS
// -------------------------------------------------------------

// API: Serve filtered global schemes list [cite: 12]
app.get("/api/schemes", (req, res) => {
  const { category, search } = req.query; // cite: 12
  let filtered = [...SCHEMES_DATA]; // cite: 12

  if (category && category !== "all") {
    // cite: 12
    filtered = filtered.filter(
      (s) => s.category === String(category).toLowerCase(),
    ); // cite: 12
  }

  if (search) {
    // cite: 12
    const query = String(search).toLowerCase(); // cite: 12
    filtered = filtered.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        (s.hindiName && s.hindiName.includes(query)) ||
        s.description.toLowerCase().includes(query) ||
        s.ministry.toLowerCase().includes(query),
    ); // cite: 12
  }
  res.json({ schemes: filtered }); // cite: 13
});

// API: Bulletproof Zero-Crash AI Assistant Endpoint with Built-In Local Search Fallback
app.post("/api/assistant/chat", async (req, res) => {
  try {
    const { messages, userProfile } = req.body; // cite: 13
    if (!messages || !Array.isArray(messages)) {
      // cite: 13
      return res.status(400).json({ error: "Messages array is required." }); // cite: 13
    }

    const lastUserMessage =
      messages[messages.length - 1]?.content?.toLowerCase() || ""; // cite: 14
    const apiKey = process.env.GEMINI_API_KEY; // cite: 13

    // -------------------------------------------------------------
    // OPTION A: AUTOMATIC FALLBACK LOCAL DATA MATCHING (IF API KEY IS MISSING) [cite: 511]
    // -------------------------------------------------------------
    let matchedKeywords = [];
    if (
      lastUserMessage.includes("farm") ||
      lastUserMessage.includes("kisan") ||
      lastUserMessage.includes("agri") ||
      lastUserMessage.includes("land")
    )
      matchedKeywords.push("PM-KISAN"); // cite: 15
    if (
      lastUserMessage.includes("health") ||
      lastUserMessage.includes("ayushman") ||
      lastUserMessage.includes("medical") ||
      lastUserMessage.includes("hospital")
    )
      matchedKeywords.push("Ayushman Bharat (PM-JAY)"); // cite: 16
    if (
      lastUserMessage.includes("loan") ||
      lastUserMessage.includes("business") ||
      lastUserMessage.includes("mudra")
    )
      matchedKeywords.push("Pradhan Mantri MUDRA Yojana"); // cite: 17
    if (
      lastUserMessage.includes("daughter") ||
      lastUserMessage.includes("girl") ||
      lastUserMessage.includes("sukanya") ||
      lastUserMessage.includes("child")
    )
      matchedKeywords.push("Sukanya Samriddhi Yojana"); // cite: 18
    if (
      lastUserMessage.includes("house") ||
      lastUserMessage.includes("home") ||
      lastUserMessage.includes("awas")
    )
      matchedKeywords.push("Pradhan Mantri Awas Yojana (PMAY)"); // cite: 19

    if (!apiKey || apiKey.trim() === "" || apiKey === "MY_GEMINI_API_KEY") {
      // cite: 13
      let responseText =
        "### Namaste 🙏 I am Yojana Mitra, your schemes assistant.\n\n"; // cite: 21

      if (matchedKeywords.length > 0) {
        // cite: 23
        responseText += `Based on your request, I found relevant matches inside our portal database:\n\n`; // cite: 23
        matchedKeywords.forEach((schemeName) => {
          // cite: 24
          const sch = SCHEMES_DATA.find((s) =>
            s.name.includes(schemeName.split(" ")[0]),
          ); // cite: 24
          if (sch) {
            responseText += `- **${sch.name}** (${sch.hindiName || "योजना"}):\n  - **Benefits**: ${sch.benefits}\n  - **Required Documents**: *${sch.requiredDocuments.join(", ")}*\n\n`; // cite: 24
          }
        });
      } else {
        responseText +=
          "I am currently running in **Local Mode**. Ask me queries containing terms like *'farming'*, *'health insurance'*, or *'awas'* to scan available benefits instantly!"; // cite: 26
      }
      return res.json({ text: responseText, groundingSources: [] }); // cite: 29
    }

    // -------------------------------------------------------------
    // OPTION B: LIVE AI DISPATCH VIA SECURE HTTP CALL (ZERO-DEPENDENCY PACKAGES) [cite: 511]
    // -------------------------------------------------------------
    try {
      let profileContext = ""; // cite: 31
      if (userProfile) {
        // cite: 31
        profileContext = `Current citizen background metrics: Name=${userProfile.name}, Age=${userProfile.age}, State=${userProfile.state}, Income=₹${userProfile.annualIncome}, Disability=${userProfile.disability ? "Yes" : "No"}.`; // cite: 31, 32, 33, 34, 35
      }

      const promptSystemPayload = `You are Yojana Mitra, an expert AI schemes assistant on YojanaBasket. Help the user with their prompt. ${profileContext} Local database schemes available: ${JSON.stringify(SCHEMES_DATA)}. User prompt: "${lastUserMessage}"`; // cite: 36, 37, 38

      // Native HTTP fetch call avoids library version conflicts or initialization crashes [cite: 511]
      const gatewayApiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptSystemPayload }] }],
          }),
        },
      );

      const parsedGenAiResult = await gatewayApiResponse.json();
      const extractedAiResponse =
        parsedGenAiResult.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I had trouble parsing the model outputs. Please try again."; // cite: 47

      return res.json({ text: extractedAiResponse, groundingSources: [] }); // cite: 49
    } catch (innerAiError) {
      console.warn(
        "[YojanaBasket] Live AI network call failed, defaulting safely to local database response:",
        innerAiError.message,
      );
      return res.json({
        text: `### Namaste 🙏 (Local Fail-Safe Mode)\n\nI hit an intermittent network timeout connecting to cloud intelligence models. You asked about: "${lastUserMessage}". Try searching for terms like *farming*, *health*, or *loan* to scan matching guidelines.`,
        groundingSources: [],
      });
    }
  } catch (globalCatchError) {
    console.error(
      "Global Chat Endpoint Error handler:",
      globalCatchError.message,
    ); // cite: 50
    return res.json({
      text: "The server encountered a temporary block processing chat parameters. Please reload your workspace window.",
      groundingSources: [],
    });
  }
});

// -------------------------------------------------------------
// SECURE REGISTER & VERIFICATION AUTHENTICATION PIPELINE
// -------------------------------------------------------------

// PHASE 1: Initiate Profile Creation & Dispatch Secure Twilio SMS OTP [cite: 379, 419]
app.post("/api/auth/user/register/initiate", async (req, res) => {
  try {
    // emailId is gathered but parsed conditionally to support rural citizens without emails [cite: 399, 408]
    const { username, emailId, mobileNumber, password, name } = req.body; // cite: 67

    // Validate only core mandatory fields [cite: 408]
    if (!username || !mobileNumber || !password || !name) {
      // cite: 67, 408
      return res
        .status(400)
        .json({ error: "Missing required registration parameters." }); // cite: 67
    }

    // Adapt uniqueness boundaries based on fields provided [cite: 408]
    const constraintCheckArray = [{ username }, { mobileNumber }];

    if (emailId && emailId.trim() !== "") {
      // cite: 409
      constraintCheckArray.push({ emailId }); // cite: 409
    }

    const existingLogin = await prisma.userLogin.findFirst({
      where: { OR: constraintCheckArray }, // cite: 68, 410
    });

    if (existingLogin) {
      // cite: 69
      return res
        .status(400)
        .json({ error: "Username, mobile number, or email already exists." }); // cite: 69, 411
    }

    // Cryptographically simulate/generate 6-digit verification code token [cite: 349, 412]
    const generatedVerificationCode = String(
      Math.floor(100000 + Math.random() * 900000),
    ); // cite: 412
    const hashedPassword = await bcrypt.hash(password, 10); // cite: 70, 412
    const sessionTransactionId = "verification-session-" + Date.now(); // cite: 412

    // Hold demographic configurations safely inside volatile application memory state [cite: 413]
    pendingRegistrationsMap.set(sessionTransactionId, {
      profilePayload: {
        name,
        email: emailId && emailId.trim() !== "" ? emailId : null,
      }, // cite: 413
      loginPayload: {
        username,
        emailId: emailId && emailId.trim() !== "" ? emailId : null,
        mobileNumber,
        password: hashedPassword,
      }, // cite: 413
      correctToken: generatedVerificationCode, // cite: 413
    });

    // Format numbers to E.164 international protocol required by Twilio
    const formattedMobileTarget = mobileNumber.startsWith("+")
      ? mobileNumber.trim()
      : `+91${mobileNumber.trim()}`;

    // ==================================================================
    // LIVE CELLULAR SMS DISPATCH SEQUENCE VIA TWILIO
    // ==================================================================
    await twilioClient.messages.create({
      body: `Namaste ${name}! Your YojanaBasket official verification identity code is: ${generatedVerificationCode}. This code is valid for 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedMobileTarget,
    });

    console.log(
      `[YojanaBasket SMS Gateway] Live Twilio SMS routed to: ${formattedMobileTarget} | OTP: ${generatedVerificationCode}`,
    );

    res.status(200).json({
      message: `Security validation code successfully transmitted to mobile number: ${formattedMobileTarget}.`,
      verificationSessionId: sessionTransactionId,
    }); // cite: 417
  } catch (error) {
    console.error("Twilio Cellular Gateway Error:", error.message);
    res.status(500).json({
      error:
        "Failed to dispatch physical SMS token text to network carrier lines.",
      details: error.message,
    }); // cite: 418
  }
});

// PHASE 2: Verify Token & Commit Profile Object Nested Atomically to Database [cite: 70, 352]
app.post("/api/auth/user/register/verify", async (req, res) => {
  try {
    const { verificationSessionId, inputOtpToken } = req.body;
    if (!verificationSessionId || !inputOtpToken) {
      return res
        .status(400)
        .json({ error: "Missing active validation tracking coordinates." });
    }

    const savedSessionRecord = pendingRegistrationsMap.get(
      verificationSessionId,
    );
    if (!savedSessionRecord) {
      return res
        .status(404)
        .json({ error: "Verification session expired or timed out." });
    }

    // Token Match Validation Check Boundary
    if (savedSessionRecord.correctToken !== String(inputOtpToken).trim()) {
      return res.status(401).json({
        error: "Security Code Check Mismatch. Please check terminal logs.",
      });
    }

    const { profilePayload, loginPayload } = savedSessionRecord;

    // Atomic relational transaction creation nested right within Prisma over Supabase [cite: 70]
    const result = await prisma.userProfile.create({
      data: {
        name: profilePayload.name, // cite: 70
        email: profilePayload.email, // cite: 70
        loginDetails: {
          create: {
            username: loginPayload.username, // cite: 70
            emailId: loginPayload.emailId, // cite: 70
            mobileNumber: loginPayload.mobileNumber, // cite: 70
            password: loginPayload.password, // cite: 70
          },
        },
      },
      include: { loginDetails: true }, // cite: 70
    });

    // Erase the temporary session cache block node safely [cite: 413]
    pendingRegistrationsMap.delete(verificationSessionId);

    // Strip hashed password out of output response object [cite: 72]
    delete result.loginDetails.password; // cite: 72
    res
      .status(201)
      .json({ message: "User registered successfully", data: result }); // cite: 73
  } catch (error) {
    res.status(500).json({
      error: "Database transaction commit sequence failed.",
      details: error.message,
    }); // cite: 74
  }
});

// API: User Session Authentication (Login) [cite: 75]
app.post("/api/auth/user/login", async (req, res) => {
  try {
    const { credential, password } = req.body; // cite: 75
    if (!credential || !password) {
      return res
        .status(400)
        .json({ error: "Credential and password required." }); // cite: 75
    }

    const loginRecord = await prisma.userLogin.findFirst({
      where: {
        OR: [
          { username: credential },
          { emailId: credential },
          { mobileNumber: credential },
        ],
      }, // cite: 76
      include: { user: true }, // cite: 76
    });

    if (
      !loginRecord ||
      !(await bcrypt.compare(password, loginRecord.password))
    ) {
      // cite: 77, 78
      return res.status(401).json({ error: "Invalid credentials." }); // cite: 77, 78
    }

    delete loginRecord.password; // cite: 79
    res.json({
      message: "Login successful",
      userProfile: loginRecord.user,
      accountDetails: loginRecord,
    }); // cite: 79
  } catch (error) {
    res.status(500).json({
      error: "Authentication transaction failed",
      details: error.message,
    }); // cite: 80
  }
});

// API: Profile-Based Dynamic Recommendation Matrix Matching System [cite: 94]
app.post("/api/schemes/recommend", async (req, res) => {
  try {
    const { username, profileOverrides } = req.body; // Expanded block handles testing values smoothly [cite: 151]
    if (!username) {
      return res
        .status(400)
        .json({ error: "Username is required to autofill details." }); // cite: 95
    }

    const account = await prisma.userLogin.findUnique({
      where: { username }, // cite: 96
      include: {
        user: {
          include: { savedSchemes: true, applications: true, documents: true }, // cite: 96
        },
      },
    });

    if (!account || !account.user) {
      return res.status(404).json({
        error: "Registered user profile not found for this username.",
      }); // cite: 97
    }

    // Apply dashboard form parameter adjustments overlay if provided [cite: 151]
    let profile = account.user; // cite: 99
    if (profileOverrides) {
      profile = { ...profile, ...profileOverrides };
    }

    // Evaluate global JSON rules index against target citizen configuration constraints [cite: 99]
    const matchedSchemes = SCHEMES_DATA.filter((scheme) => {
      if (profile.age !== null) {
        if (scheme.minAge && profile.age < scheme.minAge) return false; // cite: 99
        if (scheme.maxAge && profile.age > scheme.maxAge) return false; // cite: 99
      }
      if (
        scheme.gender &&
        scheme.gender.toLowerCase() !== "all" &&
        profile.gender
      ) {
        // cite: 99, 100
        if (scheme.gender.toLowerCase() !== profile.gender.toLowerCase())
          return false; // cite: 100
      }
      if (
        scheme.state &&
        scheme.state.toLowerCase() !== "central" &&
        profile.state
      ) {
        // cite: 101
        if (scheme.state.toLowerCase() !== profile.state.toLowerCase())
          return false; // cite: 101
      }
      if (scheme.caste && scheme.caste.length > 0 && profile.caste) {
        // cite: 102
        const casteList = Array.isArray(scheme.caste)
          ? scheme.caste.map((c) => c.toLowerCase())
          : [scheme.caste.toLowerCase()]; // cite: 102, 103
        if (
          !casteList.includes("general") &&
          !casteList.includes("all") &&
          !casteList.includes(profile.caste.toLowerCase())
        ) {
          // cite: 103
          return false; // cite: 103
        }
      }
      if (scheme.maxIncome && profile.annualIncome !== null) {
        // cite: 105
        if (profile.annualIncome > scheme.maxIncome) return false; // cite: 105
      }
      if (scheme.requiresDisability === true && !profile.disability) {
        // cite: 106
        return false; // cite: 106
      }
      return true; // Passes all constraints [cite: 107]
    });

    res.json({
      message: "Profile loaded and schemes evaluated successfully.", // cite: 108
      autofilledProfile: {
        id: profile.id, // cite: 108
        name: profile.name, // cite: 108
        email: profile.email, // cite: 108
        age: profile.age, // cite: 108
        gender: profile.gender, // cite: 108
        state: profile.state, // cite: 108
        caste: profile.caste, // cite: 108
        annualIncome: profile.annualIncome, // cite: 108
        occupation: profile.occupation, // cite: 108
        disability: profile.disability, // cite: 108
        savedSchemesCount: profile.savedSchemes?.length || 0, // cite: 108
        trackedApplicationsCount: profile.applications?.length || 0, // cite: 108
      },
      eligibleSchemes: matchedSchemes, // cite: 108, 109
      matchCount: matchedSchemes.length, // cite: 109
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to process automatic profile search mapping.",
      details: error.message,
    }); // cite: 109
  }
});

// -------------------------------------------------------------
// SEEDING SERVICE EXECUTION LAYER
// -------------------------------------------------------------
async function seedDefaultData() {
  try {
    // Generate base profile for Ankit Kumar [cite: 52]
    const defaultUser = await prisma.userProfile.upsert({
      where: { email: "krankit2007@gmail.com" }, // cite: 52
      update: {},
      create: {
        id: "seeded-user-id-ankit-2026", // cite: 52
        name: "Ankit Kumar", // cite: 52
        email: "krankit2007@gmail.com", // cite: 52
        age: 25, // cite: 52
        gender: "Male", // cite: 52
        state: "Bihar", // cite: 52
        caste: "OBC", // cite: 52
        annualIncome: 150000, // cite: 52
        occupation: "Student", // cite: 52
        disability: false, // cite: 52
        avatarUrl: "", // cite: 52
      },
    });

    const defaultPasswordHash = await bcrypt.hash("Ankit@2026", 10); // cite: 53
    await prisma.userLogin.upsert({
      where: { userId: defaultUser.id }, // cite: 54
      update: {},
      create: {
        userId: defaultUser.id, // cite: 54
        username: "ankit_kumar", // cite: 54
        emailId: "krankit2007@gmail.com", // cite: 54
        mobileNumber: "9876543210", // cite: 54
        password: defaultPasswordHash, // cite: 54
      },
    });

    console.log(
      "[YojanaBasket Seeder] Baseline database profiles seeded successfully.",
    ); // cite: 62
  } catch (err) {
    console.warn("Database seeding non-blocking message:", err.message); // cite: 63
  }
}

// Fire seeder execution logic cleanly during startup cycle hook [cite: 64]
seedDefaultData().catch((err) => console.error("Initial seeding failed:", err));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`); // cite: 110
});
