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
const nodemailer = require("nodemailer");

const mailTransporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify email service configuration on server startup
mailTransporter.verify((error, success) => {
  if (error) {
    console.warn(
      "⚠️ [Nodemailer Warning]: SMTP Transporter not ready. Check EMAIL_USER and EMAIL_PASS in .env file.",
    );
  } else {
    console.log(
      "✅ [YojanaBasket]: Real Email OTP Transporter ready to deliver live messages!",
    );
  }
});

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
        "### Namaste 🙏 I am Sarthi, your schemes assistant.\n\n"; // cite: 31

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

      const promptSystemPayload = `You are Sarthi, an expert AI Central Schemes Assistant on YojanaBasket. Help the user with their prompt. ${profileContext} Local database schemes available: ${JSON.stringify(SCHEMES_DATA)}. User prompt: "${lastUserMessage}"`; // cite: 46, 47, 48

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
// -------------------------------------------------------------
// USER REGISTRATION INITIATE (EMAIL OTP DISPATCH)
// -------------------------------------------------------------
app.post("/api/auth/user/register/initiate", async (req, res) => {
  try {
    const { username, emailId, mobileNumber, password, name } = req.body;

    if (!username || !emailId || !mobileNumber || !password || !name) {
      return res.status(400).json({
        error:
          "All registration parameters (Name, Username, Email ID, Mobile Number, Password) are mandatory.",
      });
    }

    const trimmedEmail = emailId.trim().toLowerCase();
    const trimmedMobile = mobileNumber.trim();
    const trimmedUsername = username.trim();

    // Check Uniqueness
    const existingLogin = await prisma.userLogin.findFirst({
      where: {
        OR: [
          { username: { equals: trimmedUsername, mode: "insensitive" } },
          { emailId: { equals: trimmedEmail, mode: "insensitive" } },
          { mobileNumber: trimmedMobile },
        ],
      },
    });

    if (existingLogin) {
      return res.status(400).json({
        error: "Username, email address, or mobile number already exists.",
      });
    }

    // Generate 6-Digit Verification OTP
    const generatedVerificationCode = String(
      Math.floor(100000 + Math.random() * 900000),
    );
    const hashedPassword = await bcrypt.hash(password, 10);
    const sessionTransactionId = "verification-session-" + Date.now();

    // Store in RAM memory with exact creation timestamp
    pendingRegistrationsMap.set(sessionTransactionId, {
      profilePayload: { name: name.trim(), email: trimmedEmail },
      loginPayload: {
        username: trimmedUsername,
        emailId: trimmedEmail,
        mobileNumber: trimmedMobile,
        password: hashedPassword,
      },
      correctToken: generatedVerificationCode,
      createdAt: Date.now(), // 🕒 Used to calculate 3-minute expiry
    });

    // Email Template (Updated to 3 Minutes)
    const mailOptions = {
      from: `"YojanaBasket Welfare Portal" <${process.env.EMAIL_USER}>`,
      to: trimmedEmail,
      subject: "YojanaBasket - Your Email Verification OTP Code",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8f9ff; color: #0b1c30;">
          <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 25px; border-radius: 12px; border: 1px solid #c5c6d2;">
            <h2 style="color: #00113a; margin-top: 0;">Yojana<span style="color: #1e6b37;">Basket</span></h2>
            <p>Namaste <strong>${name}</strong>,</p>
            <p>Thank you for registering on YojanaBasket. Your 6-digit verification code is:</p>
            <div style="background-color: #eaf5ed; border: 1px solid #1e6b37; text-align: center; padding: 15px; margin: 20px 0; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #1e6b37; border-radius: 8px;">
              ${generatedVerificationCode}
            </div>
            <p style="font-size: 12px; color: #d97706; font-weight: bold;">⏰ This OTP code is valid for exactly 3 minutes.</p>
            <p style="font-size: 12px; color: #444650;">If you did not request this code, please ignore this email.</p>
          </div>
        </div>
      `,
    };

    console.log(
      `[📧 EMAIL OTP DISPATCH]: ${trimmedEmail} -> ${generatedVerificationCode} (Valid for 3 mins)`,
    );

    // Dispatch Live Email
    await mailTransporter.sendMail(mailOptions);

    return res.status(200).json({
      message: `Verification OTP transmitted directly to email: ${trimmedEmail}`,
      verificationSessionId: sessionTransactionId,
    });
  } catch (error) {
    console.error("[Email OTP Delivery Error]:", error);
    return res.status(500).json({
      error:
        "Failed to deliver OTP email. Please verify your email address or check server settings.",
      details: error.message,
    });
  }
});

// PHASE 2: Verify Token & Commit Profile Object Nested Atomically to Database
app.post("/api/auth/user/register/verify", async (req, res) => {
  try {
    const { verificationSessionId, verificationToken } = req.body;

    if (!verificationSessionId || !verificationToken) {
      return res.status(400).json({
        error: "Both verification Session ID and OTP code are required.",
      });
    }

    const pendingRegistration = pendingRegistrationsMap.get(
      verificationSessionId,
    );

    if (!pendingRegistration) {
      return res.status(400).json({
        error:
          "Session expired or invalid. Please click 'Resend OTP' to generate a new code.",
      });
    }

    // 🕒 3-MINUTE EXPIRATION ENFORCEMENT (3 * 60 * 1000 = 180,000 ms)
    const THREE_MINUTES_MS = 3 * 60 * 1000;
    const elapsedTime = Date.now() - pendingRegistration.createdAt;

    if (elapsedTime > THREE_MINUTES_MS) {
      // Purge expired OTP session from RAM
      pendingRegistrationsMap.delete(verificationSessionId);
      return res.status(400).json({
        error:
          "This OTP code has expired (valid for 3 minutes). Please click 'Resend OTP' to receive a new code.",
      });
    }

    if (
      String(pendingRegistration.correctToken) !==
      String(verificationToken).trim()
    ) {
      return res
        .status(400)
        .json({
          error: "Invalid OTP code entered. Please check and try again.",
        });
    }

    // OTP Valid & Within 3 Minutes -> Create User Records
    const { profilePayload, loginPayload } = pendingRegistration;

    const createdProfile = await prisma.userProfile.create({
      data: {
        name: profilePayload.name,
        email: profilePayload.email,
        loginDetails: {
          create: loginPayload,
        },
      },
      include: {
        loginDetails: true,
      },
    });

    // Remove pending session
    pendingRegistrationsMap.delete(verificationSessionId);
    delete createdProfile.loginDetails.password;

    return res.status(201).json({
      message:
        "Email identity verified and citizen account created successfully!",
      data: createdProfile,
    });
  } catch (error) {
    console.error("[OTP Verify Error]:", error);
    return res.status(500).json({
      error: "Failed to finalize registration transaction.",
      details: error.message,
    });
  }
});

// API: User Session Authentication (Login)
// -------------------------------------------------------------
// USER LOGIN ENDPOINT (SUPPORTING USERNAME, EMAIL, OR MOBILE)
// -------------------------------------------------------------
app.post("/api/auth/user/login", async (req, res) => {
  try {
    const { credential, password } = req.body;

    // 1. Parameter Validation
    if (!credential || !password) {
      return res
        .status(400)
        .json({ error: "Credential and password parameters are required." });
    }

    const cleanCredential = String(credential).trim().toLowerCase();

    // 2. Lookup Login Record (Check Username, Email, or Mobile)
    const loginRecord = await prisma.userLogin.findFirst({
      where: {
        OR: [
          { username: { equals: cleanCredential, mode: "insensitive" } },
          { emailId: { equals: cleanCredential, mode: "insensitive" } },
          { mobileNumber: cleanCredential },
        ],
      },
      include: {
        user: true,
      },
    });

    // 3. Check if User Exists
    if (!loginRecord) {
      console.warn(
        `[Login Attempt Failed]: No user account found for credential '${credential}'`,
      );
      return res.status(401).json({
        error: "Account not found. Please register a new account first.",
      });
    }

    // 4. Verify Password Hash using bcrypt
    const isPasswordValid = await bcrypt.compare(
      password,
      loginRecord.password,
    );

    if (!isPasswordValid) {
      console.warn(
        `[Login Attempt Failed]: Incorrect password for user '${loginRecord.username}'`,
      );
      return res.status(401).json({
        error: "Invalid password. Please check your credentials and try again.",
      });
    }

    // 5. Successful Authentication -> Strip Password and Return Session Details
    const userProfileData = loginRecord.user || {
      name: loginRecord.username,
      email: loginRecord.emailId,
    };

    delete loginRecord.password;

    console.log(
      `[Login Successful]: User '${loginRecord.username}' authenticated successfully.`,
    );

    return res.status(200).json({
      message: "Login successful!",
      userProfile: userProfileData,
      accountDetails: loginRecord,
    });
  } catch (error) {
    console.error("[Login Backend Error]:", error);
    return res.status(500).json({
      error:
        "Authentication server encountered an error processing login request.",
      details: error.message,
    });
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
// -------------------------------------------------------------
// DEMOGRAPHIC ELIGIBILITY RECOMMENDATION ENGINE ROUTE
// -------------------------------------------------------------
// -------------------------------------------------------------
// DEMOGRAPHIC ELIGIBILITY RECOMMENDATION ENGINE ROUTE
// -------------------------------------------------------------
app.post("/api/schemes/recommend", async (req, res) => {
  try {
    const { username, profileOverrides } = req.body;

    // 1. Resolve Demographic Profile Context
    let userProfile = profileOverrides || {};

    if (username) {
      try {
        const account = await prisma.userLogin.findFirst({
          where: {
            OR: [
              { username: username },
              { emailId: username },
              { mobileNumber: username },
            ],
          },
          include: { user: true },
        });

        if (account && account.user) {
          const dbUser = account.user;
          userProfile = {
            age:
              profileOverrides?.age !== undefined &&
              profileOverrides?.age !== null
                ? profileOverrides.age
                : dbUser.age,
            gender: profileOverrides?.gender || dbUser.gender,
            state: profileOverrides?.state || dbUser.state,
            caste: profileOverrides?.caste || dbUser.caste,
            category: profileOverrides?.category || "all",
            annualIncome:
              profileOverrides?.annualIncome !== undefined &&
              profileOverrides?.annualIncome !== null
                ? profileOverrides.annualIncome
                : dbUser.annualIncome,
            disability:
              profileOverrides?.disability !== undefined
                ? profileOverrides.disability
                : dbUser.disability,
          };
        }
      } catch (dbErr) {
        console.warn("[Recommendation DB Warning]:", dbErr.message);
      }
    }

    // 2. Filter Active Schemes from Local Dataset (SCHEMES_DATA)
    const eligibleSchemes = SCHEMES_DATA.filter((scheme) => {
      // --- CATEGORY MATCHING ---
      if (
        userProfile.category &&
        userProfile.category.toLowerCase() !== "all"
      ) {
        if (
          scheme.category.toLowerCase() !== userProfile.category.toLowerCase()
        )
          return false;
      }

      // --- AGE LIMIT MATCHING ---
      if (
        userProfile.age !== null &&
        userProfile.age !== undefined &&
        userProfile.age !== ""
      ) {
        const userAge = parseInt(userProfile.age, 10);
        if (
          scheme.minAge !== null &&
          scheme.minAge !== undefined &&
          userAge < scheme.minAge
        )
          return false;
        if (
          scheme.maxAge !== null &&
          scheme.maxAge !== undefined &&
          userAge > scheme.maxAge
        )
          return false;
      }

      // --- GENDER REPRESENTATION MATCHING ---
      if (
        userProfile.gender &&
        scheme.gender &&
        scheme.gender.toLowerCase() !== "all"
      ) {
        if (scheme.gender.toLowerCase() !== userProfile.gender.toLowerCase())
          return false;
      }

      // --- STATE / DOMICILE MATCHING ---
      if (
        userProfile.state &&
        scheme.state &&
        scheme.state.toLowerCase() !== "central"
      ) {
        if (scheme.state.toLowerCase() !== userProfile.state.toLowerCase())
          return false;
      }

      // --- CASTE / SOCIAL CATEGORY MATCHING ---
      if (userProfile.caste && scheme.caste) {
        const schemeCaste = Array.isArray(scheme.caste)
          ? scheme.caste.join(",").toLowerCase()
          : String(scheme.caste).toLowerCase();
        if (schemeCaste !== "all" && schemeCaste !== "general") {
          if (!schemeCaste.includes(userProfile.caste.toLowerCase()))
            return false;
        }
      }

      // --- ANNUAL INCOME CEILING MATCHING ---
      if (
        userProfile.annualIncome !== null &&
        userProfile.annualIncome !== undefined &&
        userProfile.annualIncome !== ""
      ) {
        const userIncome = parseFloat(userProfile.annualIncome);
        if (
          scheme.maxIncome !== null &&
          scheme.maxIncome !== undefined &&
          userIncome > scheme.maxIncome
        )
          return false;
      }

      // --- DISABILITY CLASSIFICATION MATCHING ---
      if (scheme.requiresDisability) {
        if (!userProfile.disability) return false;
      }

      return true; // Passed all criteria checks
    });

    // 3. Return Filtered Scheme Matches
    return res.status(200).json({
      success: true,
      message: "Schemes evaluated successfully.",
      matchCount: eligibleSchemes.length,
      eligibleSchemes,
    });
  } catch (error) {
    console.error("[Recommendation Filter Failure]:", error);
    return res.status(500).json({
      error: "Failed to evaluate demographic parameters.",
      details: error.message,
    });
  }
}); // -------------------------------------------------------------
// SECURE ADMIN CONSOLE: ADD NEW SCHEME TO THE DATA CATALOG
// -------------------------------------------------------------
// -------------------------------------------------------------
// ADMINISTRATIVE GATEWAY: UPDATE AN EXISTING WELFARE SCHEME Entry
// -------------------------------------------------------------
app.post("/api/admin/schemes/update", async (req, res) => {
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

    // 1. Basic Validation Check
    if (!id) {
      return res
        .status(400)
        .json({ error: "Missing unique Scheme ID parameter slug." });
    }

    // 2. Format Comma-Separated Values into Clean Arrays if Needed
    let documentsArray = [];
    if (typeof requiredDocuments === "string") {
      documentsArray = requiredDocuments
        .split(",")
        .map((doc) => doc.trim())
        .filter((doc) => doc.length > 0);
    } else if (Array.isArray(requiredDocuments)) {
      documentsArray = requiredDocuments;
    }

    // 3. Database Update Execution Vector via Prisma
    const updatedScheme = await prisma.scheme.update({
      where: { id: id }, // Target the absolute primary identifier key
      data: {
        name,
        hindiName,
        category,
        description,
        ministry,
        benefits,
        requiredDocuments: documentsArray,
        minAge: minAge ? parseInt(minAge) : null,
        maxAge: maxAge ? parseInt(maxAge) : null,
        gender: gender || "all",
        state: state || "central",
        caste: caste || "all",
        maxIncome: maxIncome ? parseFloat(maxIncome) : null,
        requiresDisability: !!requiresDisability,
        officialLink,
      },
    });

    // 4. Return successful update context payload
    return res.status(200).json({
      success: true,
      message: "Administrative registry synchronized successfully.",
      scheme: updatedScheme,
    });
  } catch (error) {
    console.error("[Admin Update Controller Exception]:", error);

    // Handle Prisma Record Not Found Code explicitly
    if (error.code === "P2025") {
      return res.status(404).json({
        error: "The targeted scheme ID registry record does not exist.",
      });
    }

    return res
      .status(500)
      .json({ error: "Internal database write error occurred." });
  }
});
// -------------------------------------------------------------
// BASELINE DATABASE SEEDING ENGINE
// -------------------------------------------------------------
async function seedDefaultData() {
  try {
    console.log("Checking and seeding default user credentials...");

    // Seed default user profile
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
      },
    });

    // Hash default password "Ankit@2026"
    const defaultPasswordHash = await bcrypt.hash("Ankit@2026", 10);

    await prisma.userLogin.upsert({
      where: { userId: defaultUser.id },
      update: {},
      create: {
        userId: defaultUser.id,
        username: "ankit_kumar",
        emailId: "krankit2007@gmail.com",
        mobileNumber: "9876543210",
        password: defaultPasswordHash,
      },
    });

    console.log("Pre-seeded default user 'ankit_kumar' ready!");
  } catch (err) {
    console.warn("Database seeding non-blocking warning:", err.message);
  }
}

seedDefaultData();

// Trigger automatic seeder routine operations during server start sequence hook
//seedDefaultData().catch((err) => console.error("Initial seeding failed:", err));

// -------------------------------------------------------------
// ABOUT US DATA API ENDPOINT
// -------------------------------------------------------------
app.get("/api/about", (req, res) => {
  try {
    const aboutDetails = {
      portalName: "YojanaBasket",
      tagline: "All Government Schemes, One Platform",
      mission:
        "To empower every Indian citizen by providing seamless, transparent, and personalized access to Central and State government welfare schemes.",
      vision:
        "Bridging the information gap for urban and rural citizens through intelligent eligibility matching, multi-language support, and AI assistance.",
      governance: {
        trustScore: "100% Verified & Official",
        coveredStatesAndUTs: 36,
        totalSchemesCataloged: SCHEMES_DATA.length || 18000,
        citizensBenefited: "10 Crore+",
      },
      features: [
        "Personalized Eligibility Matrix Evaluation",
        "Direct Official Application Portal Links",
        "Bilingual Interface (English & Hindi)",
        "Voice Assistant Integration",
        "Interactive Sarthi AI Guidance",
      ],
    };

    return res.status(200).json({
      success: true,
      data: aboutDetails,
    });
  } catch (error) {
    console.error("[About API Error]:", error);
    return res
      .status(500)
      .json({ error: "Failed to retrieve portal information." });
  }
});

// -------------------------------------------------------------
// CONTACT US FORM SUBMISSION API ENDPOINT
// -------------------------------------------------------------
// -------------------------------------------------------------
// 1. SUBMIT CITIZEN CONTACT INQUIRY (SAVE TO DATABASE)
// -------------------------------------------------------------
app.post("/api/contact", async (req, res) => {
  try {
    const { name, mobileOrEmail, subject, message } = req.body;

    // Validation check
    if (!name || !mobileOrEmail || !message) {
      return res.status(400).json({
        error:
          "Missing required fields (Name, Contact Info, and Message are required).",
      });
    }

    // Save message directly into the database using Prisma
    const savedMessage = await prisma.contactMessage.create({
      data: {
        name: name.trim(),
        contactInfo: mobileOrEmail.trim(),
        subject: subject ? subject.trim() : "General Inquiry",
        message: message.trim(),
      },
    });

    console.log(
      `[📩 CONTACT INQUIRY SAVED TO DB]: ID ${savedMessage.id} from ${savedMessage.name}`,
    );

    return res.status(200).json({
      success: true,
      message:
        "Thank you for contacting YojanaBasket. Your inquiry has been logged successfully.",
      data: savedMessage,
    });
  } catch (error) {
    console.error("[Contact API DB Save Error]:", error);
    return res.status(500).json({
      error: "Failed to record inquiry into database.",
      details: error.message,
    });
  }
});

// -------------------------------------------------------------
// 2. ADMIN ENDPOINT: FETCH ALL CONTACT MESSAGES FROM DATABASE
// -------------------------------------------------------------
app.get("/api/admin/contact-messages", async (req, res) => {
  try {
    const messages = await prisma.contactMessage.findMany({
      orderBy: {
        createdAt: "desc", // Newest messages first
      },
    });

    return res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    console.error("[Fetch Contact Messages DB Error]:", error);
    return res.status(500).json({
      error: "Failed to retrieve contact inquiries from database.",
      details: error.message,
    });
  }
});
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`); // cite: 144
});
