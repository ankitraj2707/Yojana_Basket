/**
 * YojanaBasket - Global Bilingual Translation Map & Localization Engine
 * Supports index.html, dashboard.html, and admin.html view structures.
 */

// 1. Comprehensive Language Resource Matrix Mapping Matrix
const translationDictionary = {
  en: {
    // Global / Navbar / Brand
    brand: "YojanaBasket",
    signIn: "Sign In",
    registerTab: "New Registration",
    signOut: "Sign Out",

    // Landing Page (index.html)
    subtitle: "Direct Access to Government Welfare Schemes",
    desc: "Discover, check customized matrix constraints eligibility, and process requests instantly.",
    searchPlace: "Search parameters (e.g. Farming, Education)...",
    searchBtn: "Search",
    catalogHeading: "Explore Available Schemes",
    fullName: "Full Legal Name",
    username: "Target Username",
    email: "Email Identifier (Optional)",
    mobile: "Mobile Contact Connection",
    password: "Password",
    genOtpBtn: "Generate Security OTP",
    sarthiTitle: "Sarthi AI Assistant",
    sarthiPlace: "Ask anything regarding welfare services...",

    // Dashboard Canvas (dashboard.html)
    dashboardTitle: "Citizen Dashboard",
    demographicHeading: "Demographic Metrics Matrix",
    ageLabel: "Age Bracket (Years)",
    genderLabel: "Gender Representation",
    stateLabel: "State / Domicile",
    casteLabel: "Social Category (Caste)",
    incomeLabel: "Annual Household Income (₹)",
    disabilityLabel: "Physically Disabled Category (40% or more)",
    evaluateBtn: "Evaluate Eligible Benefits",
    welfareBoardHeading: "Personalized Welfare Match List",
    welfareSub:
      "Schemes automatically matched against your active parameters array matrix inputs.",
    applyBtnText: "Apply on Official Portal ↗",
  },
  hi: {
    // Global / Navbar / Brand
    brand: "योजनाबास्केट",
    signIn: "लॉग इन करें",
    registerTab: "नया पंजीकरण",
    signOut: "साइन आउट",

    // Landing Page (index.html)
    subtitle: "सरकारी कल्याणकारी योजनाओं तक सीधी पहुँच",
    desc: "खोजें, अपनी अनुकूलित पात्रता मानदंडों की जाँच करें, और तुरंत आवेदन करें।",
    searchPlace: "खोज मानदंड (जैसे कृषि, शिक्षा)...",
    searchBtn: "खोजें",
    catalogHeading: "उपलब्ध योजनाओं की खोज करें",
    fullName: "पूरा कानूनी नाम",
    username: "उपयोगकर्ता नाम (Username)",
    email: "ईमेल आईडी (वैकल्पिक)",
    mobile: "मोबाइल नंबर कनेक्शन",
    password: "पासवर्ड",
    genOtpBtn: "सुरक्षा ओटीपी जनरेट करें",
    sarthiTitle: "सारथी एआई सहायक",
    sarthiPlace: "कल्याणकारी सेवाओं के बारे में कुछ भी पूछें...",

    // Dashboard Canvas (dashboard.html)
    dashboardTitle: "नागरिक डैशबोर्ड",
    demographicHeading: "जनसांख्यिकीय मीट्रिक मैट्रिक्स",
    ageLabel: "आयु वर्ग (वर्ष)",
    genderLabel: "लिंग प्रतिनिधित्व",
    stateLabel: "राज्य / अधिवास",
    casteLabel: "सामाजिक श्रेणी (जाति)",
    incomeLabel: "वार्षिक पारिवारिक आय (₹)",
    disabilityLabel: "शारीरिक रूप से विकलांग श्रेणी (40% या अधिक)",
    evaluateBtn: "पात्र लाभों का मूल्यांकन करें",
    welfareBoardHeading: "व्यक्तिगत कल्याण मिलान सूची",
    welfareSub:
      "योजनाएं स्वचालित रूप से आपके सक्रिय इनपुट पैरामीटर मैट्रिक्स से मेल खाती हैं।",
    applyBtnText: "आधिकारिक पोर्टल पर आवेदन करें ↗",
  },
};

// 2. Global Runtime Language Tracking State Variable Configuration
let currentSelectedLanguage = localStorage.getItem("yojana_lang") || "en";

/**
 * Sweeps the document DOM context tree looking for [data-i18n] markers
 * and maps the dictionary text string dynamically.
 */
function applyGlobalLocalizationRegistry() {
  // Save current active language to local storage for persistent multi-page continuity
  localStorage.setItem("yojana_lang", currentSelectedLanguage);

  // Update active highlight style configurations over navbar trigger buttons cleanly
  const btnEn = document.getElementById("btnLangEn");
  const btnHi = document.getElementById("btnLangHi");

  if (btnEn && btnHi) {
    if (currentSelectedLanguage === "hi") {
      btnHi.className =
        "text-xs font-bold px-3 py-1.5 bg-primary text-white transition-all";
      btnEn.className =
        "text-xs font-bold px-3 py-1.5 text-primary transition-all";
    } else {
      btnEn.className =
        "text-xs font-bold px-3 py-1.5 bg-primary text-white transition-all";
      btnHi.className =
        "text-xs font-bold px-3 py-1.5 text-primary transition-all";
    }
  }

  // Process translation mappings over static UI element nodes
  const localizationElements = document.querySelectorAll("[data-i18n]");
  localizationElements.forEach((element) => {
    const translationKey = element.getAttribute("data-i18n");
    const translationText =
      translationDictionary[currentSelectedLanguage][translationKey];

    if (translationText) {
      // Intelligently determine if target is an input field requiring a placeholder update
      if (element.tagName === "INPUT" && element.hasAttribute("placeholder")) {
        element.setAttribute("placeholder", translationText);
      } else {
        element.innerText = translationText;
      }
    }
  });

  // Re-render core template calculation metrics if active modules exist on screen
  if (typeof executeCatalogSync === "function") {
    executeCatalogSync(); // Automatically re-renders index card streams into Hindi/English [cite: 1093]
  }
  if (typeof executeDemographicMatchResolution === "function") {
    const citizenUser = document.getElementById(
      "welcomeCitizenUsername",
    )?.innerText;
    if (citizenUser && citizenUser !== "...") {
      executeDemographicMatchResolution(citizenUser, null); // Re-renders dashboard cards into Hindi/English
    }
  }
}

/**
 * Global click action trigger mapped directly onto navigation button components
 * @param {string} targetLang - 'en' or 'hi'
 */
function togglePlatformLanguage(targetLang) {
  currentSelectedLanguage = targetLang;
  applyGlobalLocalizationRegistry();
}

// 3. Engine Initialization Lifecycle Hook
document.addEventListener("DOMContentLoaded", () => {
  applyGlobalLocalizationRegistry();
});
