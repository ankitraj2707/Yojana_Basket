const TRANSLATIONS_DICTIONARY = {
  en: {
    brand: "YojanaBasket",
    subtitle: "Direct Access to Government Welfare Schemes",
    desc: "Discover, check customized matrix constraints eligibility, and process requests instantly.",
    searchPlace: "Search parameters (e.g. Farming, Education)...",
    searchBtn: "Search",
    catalogHeading: "Explore Available Schemes",
    catalogBtn: "Evaluate Prerequisites",
    signIn: "Sign In",
    registerTab: "New Registration",
    fullName: "Full Legal Name",
    username: "Target Username",
    email: "Email Identifier (Optional)",
    mobile: "Mobile Contact Connection",
    password: "Password",
    genOtpBtn: "Generate Security OTP",
    sarthiTitle: "Sarthi AI Assistant",
    sarthiPlace: "Ask anything regarding welfare services...",
  },
  hi: {
    brand: "योजनाबास्केट",
    subtitle: "सरकारी कल्याणकारी योजनाओं तक सीधी पहुंच",
    desc: "खोजें, अपनी पात्रता शर्तों की जांच करें, और तुरंत आवेदन की प्रक्रिया शुरू करें।",
    searchPlace: "खोजें (जैसे: खेती, शिक्षा, किसान)...",
    searchBtn: "खोजें",
    catalogHeading: "उपलब्ध योजनाएं देखें",
    catalogBtn: "पात्रता की जांच करें",
    signIn: "लॉग इन करें",
    registerTab: "नया पंजीकरण",
    fullName: "पूरा कानूनी नाम",
    username: "यूज़रनेम",
    email: "ईमेल आईडी (वैकल्पिक)",
    mobile: "मोबाइल नंबर",
    password: "पासवर्ड",
    genOtpBtn: "सुरक्षा ओटीपी प्राप्त करें",
    sarthiTitle: "सारथी एआई सहायक",
    sarthiPlace: "कल्याणकारी योजनाओं के बारे में कुछ भी पूछें...",
  },
};

// Global language tracker state variable node
let currentSelectedLanguage = localStorage.getItem("yojana_lang") || "en";

function togglePlatformLanguage(langCode) {
  currentSelectedLanguage = langCode;
  localStorage.setItem("yojana_lang", langCode);

  // Apply matching static terms dynamically by matching target data-i18n structural nodes
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const translationKey = element.getAttribute("data-i18n");
    if (TRANSLATIONS_DICTIONARY[langCode][translationKey]) {
      if (element.tagName === "INPUT") {
        element.placeholder = TRANSLATIONS_DICTIONARY[langCode][translationKey];
      } else {
        element.innerText = TRANSLATIONS_DICTIONARY[langCode][translationKey];
      }
    }
  });

  // Toggle active appearance styling modifiers across UI language choices
  document.getElementById("btnLangEn").className =
    `text-xs font-bold px-3 py-1.5 rounded-l-lg border transition-all ${langCode === "en" ? "bg-primary text-white" : "bg-white text-primary"}`;
  document.getElementById("btnLangHi").className =
    `text-xs font-bold px-3 py-1.5 rounded-r-lg border-y border-r transition-all ${langCode === "hi" ? "bg-primary text-white" : "bg-white text-primary"}`;
}

// Trigger automatic parsing once layout asset stacks resolve fully onto screen view layers
document.addEventListener("DOMContentLoaded", () => {
  togglePlatformLanguage(currentSelectedLanguage);
});
