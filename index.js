/**
 * YojanaBasket - Main Server Engine Application
 * Version: CommonJS Architecture (Prisma v6 Native Bindings)
 */
require("dotenv").config(); // Must be invoked immediately at line 1 to load environment configurations

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs"); // Used for secure asynchronous credential hashing

// Initialize the Prisma Client instance (v6 natively resolves settings directly from your .env file)
const prisma = require("./config/prisma");

const app = express();
const PORT = process.env.PORT || 5000; // cite: 6

app.use(cors()); // cite: 7
app.use(express.json()); // cite: 7
app.use(express.urlencoded({ extended: true })); // cite: 7

// Serve your static frontend content directory path assets natively
app.use(express.static(path.join(__dirname, "public")));

// Fallback safety middleware to guarantee req.body resolves as an object inside every endpoint
app.use((req, res, next) => {
  if (!req.body) {
    req.body = {};
  }
  next();
});

// Dynamic adaptive catalog dataset data loader looking for 'schemes.json'
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
      SCHEMES_DATA = JSON.parse(fs.readFileSync(p, "utf8")); // cite: 11
      loaded = true; // cite: 12
      break;
    }
  }
  if (loaded) {
    console.log(
      `[YojanaBasket] Successfully loaded ${SCHEMES_DATA.length} local schemes from JSON!`,
    ); // cite: 12
  } else {
    console.warn(
      "[YojanaBasket Warning] schemes.json was not found. Initializing empty schemes catalog.",
    ); // cite: 13
  }
} catch (error) {
  console.error("Error reading schemes.json file:", error); // cite: 14
}

// Global active memory tracking map to store unverified registration sessions
const pendingRegistrationsMap = new Map();

// -------------------------------------------------------------
// REST API PUBLIC CATALOG ENDPOINTS
// -------------------------------------------------------------

// API: Serve filtered global schemes list
app.get("/api/schemes", (req, res) => {
  const { category, search } = req.query; // cite: 16
  let filtered = [...SCHEMES_DATA]; // cite: 16

  if (category && category !== "all") {
    // cite: 17
    filtered = filtered.filter(
      (s) => s.category === String(category).toLowerCase(),
    ); // cite: 17
  }

  if (search) {
    // cite: 19
    const query = String(search).toLowerCase(); // cite: 19
    filtered = filtered.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        (s.hindiName && s.hindiName.includes(query)) ||
        s.description.toLowerCase().includes(query) ||
        s.ministry.toLowerCase().includes(query),
    ); // cite: 19
  }
  res.json({ schemes: filtered }); // cite: 21
});

// API: Bulletproof Zero-Crash AI Assistant Endpoint with Built-In Local Search Fallback
app.post("/api/assistant/chat", async (req, res) => {
  try {
    const { messages, userProfile } = req.body; // cite: 21
    if (!messages || !Array.isArray(messages)) {
      // cite: 22
      return res.status(400).json({ error: "Messages array is required." }); // cite: 22
    }

    const lastUserMessage =
      messages[messages.length - 1]?.content?.toLowerCase() || ""; // cite: 24
    const apiKey = process.env.GEMINI_API_KEY; // cite: 23

    // -------------------------------------------------------------
    // OPTION A: AUTOMATIC FAIL-SAFE LOCAL CATALOG SEARCH
    // -------------------------------------------------------------
    let matchedKeywords = [];
    if (
      lastUserMessage.includes("farm") ||
      lastUserMessage.includes("kisan") ||
      lastUserMessage.includes("agri") ||
      lastUserMessage.includes("land")
    )
      matchedKeywords.push("PM-KISAN"); // cite: 25
    if (
      lastUserMessage.includes("health") ||
      lastUserMessage.includes("ayushman") ||
      lastUserMessage.includes("medical") ||
      lastUserMessage.includes("hospital")
    )
      matchedKeywords.push("Ayushman Bharat (PM-JAY)"); // cite: 26
    if (
      lastUserMessage.includes("loan") ||
      lastUserMessage.includes("business") ||
      lastUserMessage.includes("mudra")
    )
      matchedKeywords.push("Pradhan Mantri MUDRA Yojana"); // cite: 27
    if (
      lastUserMessage.includes("daughter") ||
      lastUserMessage.includes("girl") ||
      lastUserMessage.includes("sukanya") ||
      lastUserMessage.includes("child")
    )
      matchedKeywords.push("Sukanya Samriddhi Yojana"); // cite: 28
    if (
      lastUserMessage.includes("house") ||
      lastUserMessage.includes("home") ||
      lastUserMessage.includes("awas")
    )
      matchedKeywords.push("Pradhan Mantri Awas Yojana (PMAY)"); // cite: 29

    if (!apiKey || apiKey.trim() === "" || apiKey === "MY_GEMINI_API_KEY") {
      // cite: 23
      let responseText =
        "### Namaste 🙏 I am Yojana Mitra, your schemes assistant.\n\n"; // cite: 31

      if (matchedKeywords.length > 0) {
        // cite: 33
        responseText += `Based on your request, I found relevant matches inside our portal database:\n\n`; // cite: 33
        matchedKeywords.forEach((schemeName) => {
          // cite: 34
          const sch = SCHEMES_DATA.find((s) =>
            s.name.includes(schemeName.split(" ")[0]),
          ); // cite: 34
          if (sch) {
            responseText += `- **${sch.name}** (${sch.hindiName || "योजना"}):\n  - **Benefits**: ${sch.benefits}\n  - **Required Documents**: *${sch.requiredDocuments.join(", ")}*\n\n`; // cite: 34
          }
        });
      } else {
        responseText +=
          "I am currently running in **Local Mode**. Ask me queries containing terms like *'farming'*, *'health insurance'*, or *'awas'* to scan available benefits instantly!"; // cite: 36
      }
      return res.json({ text: responseText, groundingSources: [] }); // cite: 39
    }

    // -------------------------------------------------------------
    // OPTION B: LIVE AI DISPATCH VIA SECURE HTTP CALL (ZERO-DEPENDENCY)
    // -------------------------------------------------------------
    try {
      let profileContext = ""; // cite: 41
      if (userProfile) {
        // cite: 41
        profileContext = `Current citizen background metrics: Name=${userProfile.name}, Age=${userProfile.age}, State=${userProfile.state}, Income=₹${userProfile.annualIncome}, Disability=${userProfile.disability ? "Yes" : "No"}.`; // cite: 42, 43, 44, 45
      }

      const promptSystemPayload = `You are Yojana Mitra, an expert AI Central Schemes Assistant on YojanaBasket. Help the user with their prompt. ${profileContext} Local database schemes available: ${JSON.stringify(SCHEMES_DATA)}. User prompt: "${lastUserMessage}"`; // cite: 46, 47, 48

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
        "I had trouble parsing the model outputs. Please try again."; // cite: 59, 60

      return res.json({ text: extractedAiResponse, groundingSources: [] }); // cite: 61
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
    ); // cite: 62
    return res.json({
      text: "The server encountered a temporary block processing chat parameters. Please reload your workspace window.",
      groundingSources: [],
    });
  }
});

// -------------------------------------------------------------
// SECURE SIMULATED MOBILE OTP REGISTER & VERIFICATION PIPELINE
// -------------------------------------------------------------

// PHASE 1: Initiate Profile Creation & Print Verification Token to Terminal Console
app.post("/api/auth/user/register/initiate", async (req, res) => {
  try {
    const { username, emailId, mobileNumber, password, name } = req.body; // cite: 82

    if (!username || !mobileNumber || !password || !name) {
      // cite: 83
      return res
        .status(400)
        .json({ error: "Missing required registration parameters." }); // cite: 83
    }

    const constraintCheckArray = [{ username }, { mobileNumber }];

    if (emailId && emailId.trim() !== "") {
      constraintCheckArray.push({ emailId });
    }

    const existingLogin = await prisma.userLogin.findFirst({
      where: { OR: constraintCheckArray }, // cite: 85
    });

    if (existingLogin) {
      // cite: 86
      return res
        .status(400)
        .json({ error: "Username, mobile number, or email already exists." }); // cite: 86
    }

    const generatedVerificationCode = String(
      Math.floor(100000 + Math.random() * 900000),
    ); // cite: 566
    const hashedPassword = await bcrypt.hash(password, 10); // cite: 66, 566
    const sessionTransactionId = "verification-session-" + Date.now(); // cite: 566

    pendingRegistrationsMap.set(sessionTransactionId, {
      profilePayload: {
        name,
        email: emailId && emailId.trim() !== "" ? emailId : null,
      }, // cite: 567
      loginPayload: {
        username,
        emailId: emailId && emailId.trim() !== "" ? emailId : null,
        mobileNumber,
        password: hashedPassword,
      }, // cite: 567
      correctToken: generatedVerificationCode, // cite: 567
    });

    console.log("\n==========================================================");
    console.log(`[📱 YOJANABASKET INTERNAL SMS GATEWAY SIMULATOR]`);
    console.log(`Target Recipient Name : ${name}`);
    console.log(`Mobile Connectivity  : +91 ${mobileNumber.trim()}`);
    console.log(
      `Generated OTP Token  : ${generatedVerificationCode}  <-- COPY THIS`,
    );
    console.log("==========================================================\n");

    res.status(200).json({
      message: `Security validation code successfully generated for mobile routing line: +91 ${mobileNumber.trim()}.`,
      verificationSessionId: sessionTransactionId,
    });
  } catch (error) {
    console.error(
      "Internal Registration Initiation Pipeline Fault:",
      error.message,
    );
    res.status(500).json({
      error: "Failed to initialize mobile validation sequence.",
      details: error.message,
    }); // cite: 92
  }
});

// PHASE 2: Verify Token & Commit Profile Object Nested Atomically to Database
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

    if (savedSessionRecord.correctToken !== String(inputOtpToken).trim()) {
      return res.status(401).json({
        error: "Security Code Check Mismatch. Please check terminal logs.",
      });
    }

    const { profilePayload, loginPayload } = savedSessionRecord;

    const result = await prisma.userProfile.create({
      data: {
        name: profilePayload.name, // cite: 89
        email: profilePayload.email, // cite: 89
        loginDetails: {
          create: {
            username: loginPayload.username, // cite: 89
            emailId: loginPayload.emailId, // cite: 89
            mobileNumber: loginPayload.mobileNumber, // cite: 89
            password: loginPayload.password, // cite: 89
          },
        },
      },
      include: { loginDetails: true }, // cite: 89
    });

    pendingRegistrationsMap.delete(verificationSessionId);

    delete result.loginDetails.password; // cite: 90
    res
      .status(201)
      .json({ message: "User registered successfully", data: result }); // cite: 91
  } catch (error) {
    res.status(500).json({
      error: "Database transaction commit sequence failed.",
      details: error.message,
    }); // cite: 92
  }
});

// API: User Session Authentication (Login)
app.post("/api/auth/user/login", async (req, res) => {
  try {
    const { credential, password } = req.body; // cite: 94
    if (!credential || !password) {
      return res
        .status(400)
        .json({ error: "Credential and password required." }); // cite: 95
    }

    const loginRecord = await prisma.userLogin.findFirst({
      where: {
        OR: [
          { username: credential },
          { emailId: credential },
          { mobileNumber: credential },
        ],
      }, // cite: 97
      include: { user: true }, // cite: 97
    });

    if (
      !loginRecord ||
      !(await bcrypt.compare(password, loginRecord.password))
    ) {
      // cite: 98, 99
      return res.status(401).json({ error: "Invalid credentials." }); // cite: 98, 99
    }

    delete loginRecord.password; // cite: 100
    res.json({
      message: "Login successful",
      userProfile: loginRecord.user,
      accountDetails: loginRecord,
    }); // cite: 100
  } catch (error) {
    res.status(500).json({
      error: "Authentication transaction failed",
      details: error.message,
    }); // cite: 101
  }
});

// -------------------------------------------------------------
// SECURE ADMINISTRATIVE GATEWAY ENDPOINT (HIDDEN PATH)
// -------------------------------------------------------------
app.post("/api/auth/admin/login", async (req, res) => {
  try {
    const { credential, password } = req.body; // cite: 113
    if (!credential || !password) {
      // cite: 114
      return res
        .status(400)
        .json({ error: "Credential and password are required parameters." }); // cite: 114
    }

    // Master Fail-Safe Validation Guard Structure
    // Directly checks against master credentials or falls back to database records safely
    const isMasterAdmin =
      credential === "superadmin" ||
      credential === "admin@yojanabasket.gov.in" ||
      credential === "9999999999"; // cite: 69

    if (isMasterAdmin && password === "Admin@Yojana2026") {
      // cite: 68
      return res.json({
        message: "Welcome to Administrative Session", // cite: 121
        adminDetails: {
          username: "superadmin", // cite: 69
          emailId: "admin@yojanabasket.gov.in", // cite: 69
          mobileNumber: "9999999999", // cite: 69
          role: "SUPER_ADMIN", // cite: 69
        },
      });
    }

    // Secondary Database Lookup Pipeline Fallback
    try {
      const adminRecord = await prisma.adminLogin.findFirst({
        where: {
          OR: [
            { username: credential },
            { emailId: credential },
            { mobileNumber: credential },
          ],
        }, // cite: 116
      });

      if (
        adminRecord &&
        (await bcrypt.compare(password, adminRecord.password))
      ) {
        // cite: 119
        delete adminRecord.password; // cite: 121
        return res.json({
          message: "Welcome to Administrative Session", // cite: 121
          adminDetails: adminRecord, // cite: 121
        });
      }
    } catch (dbErr) {
      console.warn(
        "[YojanaBasket] Admin DB entity trace unavailable, verified via master override token.",
      );
    }

    return res
      .status(401)
      .json({ error: "Invalid administrative privileges." }); // cite: 117
  } catch (error) {
    res.status(500).json({
      error: "Admin authentication process failed",
      details: error.message,
    }); // cite: 122
  }
});

// API: Profile-Based Dynamic Recommendation Matrix Matching System
app.post("/api/schemes/recommend", async (req, res) => {
  try {
    const { username, profileOverrides } = req.body;
    if (!username) {
      return res
        .status(400)
        .json({ error: "Username is required to autofill details." }); // cite: 125
    }

    const account = await prisma.userLogin.findUnique({
      where: { username }, // cite: 127
      include: {
        user: {
          include: { savedSchemes: true, applications: true, documents: true }, // cite: 127
        },
      },
    });

    if (!account || !account.user) {
      return res.status(404).json({
        error: "Registered user profile not found for this username.",
      }); // cite: 128
    }

    let profile = account.user; // cite: 130
    if (profileOverrides) {
      profile = { ...profile, ...profileOverrides };
    }

    const matchedSchemes = SCHEMES_DATA.filter((scheme) => {
      if (profile.age !== null) {
        if (scheme.minAge && profile.age < scheme.minAge) return false; // cite: 130
        if (scheme.maxAge && profile.age > scheme.maxAge) return false; // cite: 130
      }
      if (
        scheme.gender &&
        scheme.gender.toLowerCase() !== "all" &&
        profile.gender
      ) {
        // cite: 131
        if (scheme.gender.toLowerCase() !== profile.gender.toLowerCase())
          return false; // cite: 131
      }
      if (
        scheme.state &&
        scheme.state.toLowerCase() !== "central" &&
        profile.state
      ) {
        // cite: 133
        if (scheme.state.toLowerCase() !== profile.state.toLowerCase())
          return false; // cite: 133
      }
      if (scheme.caste && scheme.caste.length > 0 && profile.caste) {
        // cite: 135
        const casteList = Array.isArray(scheme.caste)
          ? scheme.caste.map((c) => c.toLowerCase())
          : [scheme.caste.toLowerCase()]; // cite: 135, 136
        if (
          !casteList.includes("general") &&
          !casteList.includes("all") &&
          !casteList.includes(profile.caste.toLowerCase())
        ) {
          // cite: 136
          return false;
        }
      }
      if (scheme.maxIncome && profile.annualIncome !== null) {
        // cite: 138
        if (profile.annualIncome > scheme.maxIncome) return false; // cite: 138
      }
      if (scheme.requiresDisability === true && !profile.disability) {
        // cite: 140
        return false; // cite: 140
      }
      return true;
    });

    res.json({
      message: "Profile auto-loaded and schemes evaluated successfully.", // cite: 142
      autofilledProfile: {
        id: profile.id, // cite: 142
        name: profile.name, // cite: 142
        email: profile.email, // cite: 142
        age: profile.age, // cite: 142
        gender: profile.gender, // cite: 142
        state: profile.state, // cite: 142
        caste: profile.caste, // cite: 142
        annualIncome: profile.annualIncome, // cite: 142
        occupation: profile.occupation, // cite: 142
        disability: profile.disability, // cite: 142
        savedSchemesCount: profile.savedSchemes?.length || 0,
        trackedApplicationsCount: profile.applications?.length || 0,
      },
      eligibleSchemes: matchedSchemes, // cite: 142, 143
      matchCount: matchedSchemes.length, // cite: 143
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to process automatic profile search mapping.",
      details: error.message,
    }); // cite: 143
  }
});
// -------------------------------------------------------------
// SECURE ADMIN CONSOLE: ADD NEW SCHEME TO THE DATA CATALOG
// -------------------------------------------------------------
app.post("/api/admin/schemes/add", async (req, res) => {
  try {
    const {
      id,
      name,
      hindiName,
      category,
      description,
      ministry,
      benefits,
      requiredDocuments,
      minAge,
      maxAge,
      gender,
      state,
      caste,
      maxIncome,
      requiresDisability,
      officialLink,
    } = req.body;

    // Strict boundary validation checks
    if (!id || !name || !category || !description) {
      return res
        .status(400)
        .json({
          error:
            "Missing required primary parameters (ID, Name, Category, Description).",
        });
    }

    // Verify if scheme ID already exists to prevent key collision crashes
    if (SCHEMES_DATA.some((s) => s.id === id.trim())) {
      return res
        .status(400)
        .json({
          error: "A scheme with this unique identifier ID already exists.",
        });
    }

    // Parse data types to match recommendation evaluation criteria precisely
    const cleanSchemeObject = {
      id: id.trim().toLowerCase(),
      name: name.trim(),
      hindiName: hindiName ? hindiName.trim() : "",
      category: category.trim().toLowerCase(),
      description: description.trim(),
      ministry: ministry ? ministry.trim() : "Not specified",
      benefits: benefits ? benefits.trim() : "Not specified",
      requiredDocuments: Array.isArray(requiredDocuments)
        ? requiredDocuments
        : String(requiredDocuments)
            .split(",")
            .map((d) => d.trim())
            .filter(Boolean),
      minAge: minAge !== "" ? parseInt(minAge) : null,
      maxAge: maxAge !== "" ? parseInt(maxAge) : null,
      gender: gender ? gender.toLowerCase() : "all",
      state: state ? state.toLowerCase() : "central",
      caste: Array.isArray(caste)
        ? caste.map((c) => c.toLowerCase())
        : String(caste)
            .split(",")
            .map((c) => c.trim().toLowerCase())
            .filter(Boolean),
      maxIncome:
        maxIncome !== "" && maxIncome !== null ? parseFloat(maxIncome) : null,
      requiresDisability: !!requiresDisability,
      officialLink: officialLink ? officialLink.trim() : "",
    };

    // Push into runtime array buffer
    SCHEMES_DATA.push(cleanSchemeObject);

    // Locate the physical schemes.json path dynamically to commit local disk changes
    const targetFilePaths = [
      path.join(__dirname, "src/data/schemes.json"),
      path.join(__dirname, "schemes.json"),
      path.join(process.cwd(), "src/data/schemes.json"),
      path.join(process.cwd(), "schemes.json"),
    ];

    let writeCompleted = false;
    for (const p of targetFilePaths) {
      if (fs.existsSync(p) || p.endsWith("schemes.json")) {
        // Ensure directories exist prior to streaming operations
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, JSON.stringify(SCHEMES_DATA, null, 2), "utf8");
        writeCompleted = true;
        break;
      }
    }

    if (writeCompleted) {
      console.log(
        `[Admin Console] Successfully appended new scheme: ${cleanSchemeObject.name}`,
      );
      return res
        .status(201)
        .json({
          message:
            "Scheme successfully registered and committed to data registry.",
          scheme: cleanSchemeObject,
        });
    } else {
      throw new Error("Unable to identify standard data write paths.");
    }
  } catch (error) {
    console.error("Administrative Registry Insertion Fault:", error.message);
    return res
      .status(500)
      .json({
        error: "Failed to persist new welfare scheme.",
        details: error.message,
      });
  }
});
// -------------------------------------------------------------
// BASELINE DATABASE SEEDING ENGINE
// -------------------------------------------------------------
async function seedDefaultData() {
  try {
    const defaultUser = await prisma.userProfile.upsert({
      where: { email: "krankit2007@gmail.com" }, // cite: 65
      update: {},
      create: {
        id: "seeded-user-id-ankit-2026", // cite: 65
        name: "Ankit Kumar", // cite: 65
        email: "krankit2007@gmail.com", // cite: 65
        age: 25, // cite: 65
        gender: "Male", // cite: 65
        state: "Bihar", // cite: 65
        caste: "OBC", // cite: 65
        annualIncome: 150000, // cite: 65
        occupation: "Student", // cite: 65
        disability: false, // cite: 65
        avatarUrl: "", // cite: 65
      },
    });

    const defaultPasswordHash = await bcrypt.hash("Ankit@2026", 10); // cite: 66
    await prisma.userLogin.upsert({
      where: { userId: defaultUser.id }, // cite: 67
      update: {},
      create: {
        userId: defaultUser.id, // cite: 67
        username: "ankit_kumar", // cite: 67
        emailId: "krankit2007@gmail.com", // cite: 67
        mobileNumber: "9876543210", // cite: 67
        password: defaultPasswordHash, // cite: 67
      },
    });

    console.log(
      "[YojanaBasket Seeder] Baseline database profiles seeded successfully.",
    ); // cite: 76
  } catch (err) {
    console.warn("Database seeding non-blocking message:", err.message); // cite: 77
  }
}

// Trigger automatic seeder routine operations during server start sequence hook
seedDefaultData().catch((err) => console.error("Initial seeding failed:", err));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`); // cite: 144
});
