/**
 * YojanaBasket - Frontend Authentication & Session Management Engine
 * Handles login, registration modal triggers, local OTP parsing, and navbar states.
 */

// Global state tracking coordinates for registration flow validation checks
let activeVerificationSessionTokenId = null;
let currentActiveAuthTab = "LOGIN";

// ==================================================================
// 1. NAVBAR & SESSION MANAGEMENT UTILITIES
// ==================================================================

/**
 * Dynamically renders the login/logout buttons in the header navigation bar
 * based on whether a valid session token exists in local storage.
 */
function renderNavbarAuthenticationState() {
  const navAuthLinks = document.getElementById("navAuthLinks");
  if (!navAuthLinks) return;

  const activeSession = localStorage.getItem("yojana_session_token");

  // Read the current selected language to maintain bilingual continuity on re-render
  const isHindi = localStorage.getItem("yojana_lang") === "hi";

  if (activeSession) {
    const signOutText = isHindi ? "साइन आउट" : "Sign Out";
    // If logged in, inject a clean operational Sign Out action button node
    navAuthLinks.innerHTML = `
            <button onclick="executeUserSignOut()" class="bg-red-50 text-red-700 font-bold px-4 py-2 text-sm rounded-lg hover:bg-red-100 transition-all min-h-[40px]">
                ${signOutText}
            </button>
        `;
  } else {
    const signInText = isHindi ? "लॉग इन करें" : "Sign In";
    const registerText = isHindi ? "नया पंजीकरण" : "New Registration";
    // If logged out, render standard action panel modal triggers
    navAuthLinks.innerHTML = `
            <button onclick="toggleAuthModal(true, 'LOGIN')" class="text-sm font-bold text-primary hover:text-primary-container mr-4">
                ${signInText}
            </button>
            <button onclick="toggleAuthModal(true, 'REGISTER')" class="bg-primary text-white font-bold px-4 py-2 text-sm rounded-lg hover:bg-primary-container transition-all min-h-[40px]">
                ${registerText}
            </button>
        `;
  }
}

/**
 * Destroys active user identity state tokens and redirects cleanly to home framework layout.
 */
function executeUserSignOut() {
  localStorage.removeItem("yojana_session_token");
  renderNavbarAuthenticationState();
  window.location.href = "/index.html";
}

// ==================================================================
// 2. MODAL & INTERFACE ELEMENT UTILITIES
// ==================================================================

function toggleAuthModal(show, explicitlyTargetTab = "LOGIN") {
  const modal = document.getElementById("authOverlayModal");
  if (!modal) return;

  if (show) {
    modal.classList.remove("hidden");
    switchAuthTab(explicitlyTargetTab);
  } else {
    modal.classList.add("hidden");
    // Reset validation forms cleanly upon closure
    document
      .getElementById("registrationInputsWrapper")
      .classList.remove("hidden");
    document.getElementById("otpValidationWrapper").classList.add("hidden");
    activeVerificationSessionTokenId = null;
  }
  triggerAuthMessage("", "CLEAR");
}

function switchAuthTab(targetTab) {
  currentActiveAuthTab = targetTab;
  const loginForm = document.getElementById("portalLoginForm");
  const registerForm = document.getElementById("portalRegisterForm");
  const tabLoginBtn = document.getElementById("tabLoginBtn");
  const tabRegisterBtn = document.getElementById("tabRegisterBtn");

  triggerAuthMessage("", "CLEAR");

  if (targetTab === "LOGIN") {
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    tabLoginBtn.className =
      "w-1/2 py-3 text-sm font-bold text-primary border-b-2 border-primary bg-white";
    tabRegisterBtn.className =
      "w-1/2 py-3 text-sm font-semibold text-on-surface-variant";
  } else {
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    tabRegisterBtn.className =
      "w-1/2 py-3 text-sm font-bold text-primary border-b-2 border-primary bg-white";
    tabLoginBtn.className =
      "w-1/2 py-3 text-sm font-semibold text-on-surface-variant";
  }
}

function triggerAuthMessage(message, level) {
  const banner = document.getElementById("authAlertBanner");
  if (!banner) return;

  if (level === "CLEAR" || !message) {
    banner.classList.add("hidden");
    return;
  }

  banner.innerText = message;
  banner.classList.remove("hidden");

  if (level === "SUCCESS") {
    banner.className =
      "mb-4 p-3 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200";
  } else {
    banner.className =
      "mb-4 p-3 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200";
  }
}

// ==================================================================
// 3. BACKEND GATEWAY TRANSACTION SUBMISSIONS
// ==================================================================

/**
 * Handles credentials verification and sets up active dashboard sessions.
 */
async function executeUserLogin(event) {
  event.preventDefault();

  const credential = document
    .getElementById("loginCredentialField")
    .value.trim();
  const password = document.getElementById("loginPasswordField").value;

  try {
    const response = await fetch("/api/auth/user/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential, password }),
    });

    const output = await response.json();

    if (!response.ok) {
      triggerAuthMessage(
        output.error || "Invalid credentials provided.",
        "ERROR",
      );
      return;
    }

    // Cache the session payload securely in user browser memory
    localStorage.setItem(
      "yojana_session_token",
      JSON.stringify(output.accountDetails),
    );

    // Instant visual update without forcing full hard page reloads
    renderNavbarAuthenticationState();

    triggerAuthMessage(
      "Welcome back! Initializing dashboard details...",
      "SUCCESS",
    );

    // Wrap closure action and change routing target cleanly
    setTimeout(() => {
      toggleAuthModal(false);
      window.location.href = "/dashboard.html";
    }, 800);
  } catch (err) {
    triggerAuthMessage(
      "Transit fault connecting to authorization gateway pipelines.",
      "ERROR",
    );
  }
}

/**
 * Registration Phase 1: Submits demographic profiles and fires a simulated SMS OTP to terminal.
 */
async function executeUserRegistration(event) {
  event.preventDefault();

  const name = document.getElementById("regNameField").value.trim();
  const username = document.getElementById("regUsernameField").value.trim();
  const mobileNumber = document.getElementById("regMobileField").value.trim();
  const password = document.getElementById("regPasswordField").value;

  // ADAPTIVE RURAL STRATEGY: Treat email as entirely optional
  const emailInput = document.getElementById("regEmailField").value.trim();
  const emailId = emailInput !== "" ? emailInput : null;

  try {
    const response = await fetch("/api/auth/user/register/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, emailId, mobileNumber, password }),
    });

    const output = await response.json();

    if (!response.ok) {
      triggerAuthMessage(
        output.error || "Registration sequence parameter conflict.",
        "ERROR",
      );
      return;
    }

    // Cache the memory transaction tracker tracking ID token returned by the server
    activeVerificationSessionTokenId = output.verificationSessionId;

    // Transition form cards dynamically to display the OTP card intercept overlay wrapper
    document
      .getElementById("registrationInputsWrapper")
      .classList.add("hidden");
    document.getElementById("otpValidationWrapper").classList.remove("hidden");

    triggerAuthMessage(
      "Simulated SMS Token generated! Copy the 6-digit OTP code directly from your running Node VS Code server terminal window.",
      "SUCCESS",
    );
  } catch (err) {
    triggerAuthMessage(
      "Transit exception sending parameters to registration initiation loops.",
      "ERROR",
    );
  }
}

/**
 * Registration Phase 2: Compares inputs with terminal codes and commits user data atomically.
 */
async function commitSecureOtpVerification() {
  const inputOtpToken = document
    .getElementById("regOtpTokenField")
    .value.trim();
  if (!inputOtpToken || inputOtpToken.length !== 6) {
    triggerAuthMessage(
      "Please enter a complete 6-digit numeric OTP token.",
      "ERROR",
    );
    return;
  }

  try {
    const response = await fetch("/api/auth/user/register/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verificationSessionId: activeVerificationSessionTokenId,
        inputOtpToken,
      }),
    });

    const output = await response.json();

    if (!response.ok) {
      triggerAuthMessage(
        output.error || "Security verification token check failed.",
        "ERROR",
      );
      return;
    }

    triggerAuthMessage(
      "Identity confirmed successfully! Switching window to Sign In...",
      "SUCCESS",
    );

    // Auto-transition to login panel after a brief operational delay
    setTimeout(() => {
      switchAuthTab("LOGIN");
      // Populate the newly created identity username automatically to ease workflow tracking
      if (output.data && output.data.loginDetails) {
        document.getElementById("loginCredentialField").value =
          output.data.loginDetails.username;
      }
    }, 1500);
  } catch (err) {
    triggerAuthMessage(
      "Transit error connecting to verification execution loop hooks.",
      "ERROR",
    );
  }
}

// ==================================================================
// 4. CORE ENGINE LIFECYCLE INITIALIZER TRIGGER
// ==================================================================
document.addEventListener("DOMContentLoaded", () => {
  renderNavbarAuthenticationState();
});
