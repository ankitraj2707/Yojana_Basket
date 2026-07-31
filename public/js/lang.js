/**
 * Universal i18n Translation Dictionary - YojanaBasket
 */

const translations = {
  en: {
    brand: "YojanaBasket",
    navHome: "Home",
    navSchemes: "Schemes ▾",
    navCategories: "Categories",
    navStates: "States",
    navAi: "AI Assistant",
    navAbout: "About Us",
    navContact: "Contact Us",
    signIn: "Login / Sign Up",
    registerTab: "New Registration",
    subtitle: "All Government Schemes, One Platform",
    desc: "Find, check eligibility and apply for Central and State Government schemes easily at one place.",
    searchPlace: "Search for schemes, keywords...",
    searchBtn: "Search",
    catalogHeading: "Popular Schemes",

    // Category Pills
    catEducation: "Education",
    catAgriculture: "Agriculture",
    catHealth: "Health",
    catEmployment: "Employment",
    catHousing: "Housing",
    catWomen: "Women",
    catMsme: "MSME",
    catAll: "All Categories",

    // Scheme Modal Headers
    modalOverview: "Scheme Overview",
    modalBenefits: "Key Citizen Benefits",
    modalStepsTitle: "How to Apply (Step-by-Step Guide)",
    modalRegion: "Applicable Region:",

    // Defaults
    docList: "Aadhaar Card, Land Ownership Papers, Bank Account Passbook",
    sarthiTitle: "Sarthi AI Assistant",
    sarthiPlace: "Ask anything regarding welfare services...",
  },
  hi: {
    brand: "योजनाबास्केट",
    navHome: "मुख्य पृष्ठ",
    navSchemes: "योजनाएं ▾",
    navCategories: "श्रेणियां",
    navStates: "राज्य",
    navAi: "एआई सहायक",
    navAbout: "हमारे बारे में",
    navContact: "संपर्क करें",
    signIn: "लॉगिन / साइन अप",
    registerTab: "नया पंजीकरण",
    subtitle: "सभी सरकारी योजनाएं, एक ही मंच पर",
    desc: "केंद्र और राज्य सरकार की योजनाओं को आसानी से खोजें, पात्रता जांचें और आवेदन करें।",
    searchPlace: "योजनाएं या कीवर्ड खोजें...",
    searchBtn: "खोजें",
    catalogHeading: "लोकप्रिय योजनाएं",

    // Category Pills
    catEducation: "शिक्षा",
    catAgriculture: "कृषि",
    catHealth: "स्वास्थ्य",
    catEmployment: "रोजगार",
    catHousing: "आवास",
    catWomen: "महिला कल्याण",
    catMsme: "एमएसएमई",
    catAll: "सभी श्रेणियां",

    // Scheme Modal Headers
    modalOverview: "योजना का विवरण",
    modalBenefits: "मुख्य नागरिक लाभ",
    modalStepsTitle: "आवेदन करने के चरण (Step-by-Step Guide)",
    modalRegion: "लागू क्षेत्र:",

    // Defaults
    docList: "आधार कार्ड, भूमि स्वामित्व दस्तावेज, बैंक खाता पासबुक",
    sarthiTitle: "सारथी एआई सहायक",
    sarthiPlace: "कल्याणकारी सेवाओं के बारे में कुछ भी पूछें...",
  },
};

function togglePlatformLanguage(lang) {
  localStorage.setItem("yojana_lang", lang);
  applyPlatformTranslations();

  if (typeof executeCatalogSync === "function") executeCatalogSync();
  if (typeof renderDashboardRegisteredSchemes === "function")
    renderDashboardRegisteredSchemes();
  if (typeof updateSchemeModalCTA === "function") updateSchemeModalCTA();
  if (typeof renderNavbarAuthenticationState === "function")
    renderNavbarAuthenticationState();
}

function applyPlatformTranslations() {
  const currentLang = localStorage.getItem("yojana_lang") || "en";
  const dict = translations[currentLang] || translations.en;

  const btnEn = document.getElementById("btnLangEn");
  const btnHi = document.getElementById("btnLangHi");
  if (btnEn && btnHi) {
    if (currentLang === "hi") {
      btnEn.className =
        "text-xs font-bold px-2.5 sm:px-3 py-1.5 text-primary transition-all";
      btnHi.className =
        "text-xs font-bold px-2.5 sm:px-3 py-1.5 bg-primary text-white transition-all";
    } else {
      btnEn.className =
        "text-xs font-bold px-2.5 sm:px-3 py-1.5 bg-primary text-white transition-all";
      btnHi.className =
        "text-xs font-bold px-2.5 sm:px-3 py-1.5 text-primary transition-all";
    }
  }

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) {
      if (el.tagName === "INPUT" && el.hasAttribute("placeholder")) {
        el.placeholder = dict[key];
      } else {
        el.innerText = dict[key];
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  applyPlatformTranslations();
});
