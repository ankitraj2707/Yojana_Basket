/**
 * Authentication Engine & Session State Controller - YojanaBasket
 */

document.addEventListener("DOMContentLoaded", () => {
  renderNavbarAuthenticationState();
});

function renderNavbarAuthenticationState() {
  const navSlot = document.getElementById("navAuthLinks");
  if (!navSlot) return;

  const token = localStorage.getItem("yojana_session_token");
  const isHindi = localStorage.getItem("yojana_lang") === "hi";

  if (token) {
    let userDetails = { name: "Citizen" };
    try {
      userDetails = JSON.parse(token);
    } catch (e) {}

    const userName = userDetails.name || userDetails.username || "Citizen";
    const dashboardText = isHindi ? "डैशबोर्ड" : "Dashboard";
    const signOutText = isHindi ? "साइन आउट" : "Sign Out";

    navSlot.innerHTML = `
            <div class="flex items-center gap-2.5">
                <a href="/dashboard.html" class="bg-brand-green-light text-brand-green font-bold text-xs px-3.5 py-2 rounded-lg hover:bg-brand-green hover:text-white transition-all flex items-center gap-1.5 shadow-sm min-h-[38px] whitespace-nowrap">
                    <span class="material-symbols-outlined text-sm">dashboard</span>
                    <span>${dashboardText} (${userName})</span>
                </a>
                <button onclick="executeUserSignOut()" class="bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 font-bold text-xs px-3 py-2 rounded-lg transition-all border border-gray-200 min-h-[38px] whitespace-nowrap">
                    ${signOutText}
                </button>
            </div>
        `;
  } else {
    const loginText = isHindi ? "लॉगिन / साइन अप" : "Login / Sign Up";
    navSlot.innerHTML = `
            <button onclick="toggleAuthModal(true, 'LOGIN')" class="bg-brand-green text-white font-bold text-xs px-4 sm:px-5 py-2 rounded-lg hover:bg-brand-green-dark transition-all flex items-center gap-1.5 shadow-sm min-h-[38px] whitespace-nowrap">
                <span class="material-symbols-outlined text-sm">person</span>
                <span data-i18n="signIn">${loginText}</span>
            </button>
        `;
  }
}

function toggleAuthModal(show, defaultTab = "LOGIN") {
  const modal = document.getElementById("authOverlayModal");
  const alertBanner = document.getElementById("authAlertBanner");
  if (!modal) return;

  if (show) {
    modal.classList.remove("hidden");
    if (alertBanner) alertBanner.classList.add("hidden");
    switchAuthTab(defaultTab);
  } else {
    modal.classList.add("hidden");
  }
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById("portalLoginForm");
  const registerForm = document.getElementById("portalRegisterForm");
  const loginBtn = document.getElementById("tabLoginBtn");
  const regBtn = document.getElementById("tabRegisterBtn");

  if (!loginForm || !registerForm) return;

  if (tab === "LOGIN") {
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    if (loginBtn)
      loginBtn.className =
        "w-1/2 py-3 text-sm font-bold text-primary border-b-2 border-primary bg-white";
    if (regBtn)
      regBtn.className =
        "w-1/2 py-3 text-sm font-semibold text-on-surface-variant bg-surface-container-low";
  } else {
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    if (regBtn)
      regBtn.className =
        "w-1/2 py-3 text-sm font-bold text-brand-green border-b-2 border-brand-green bg-white";
    if (loginBtn)
      loginBtn.className =
        "w-1/2 py-3 text-sm font-semibold text-on-surface-variant bg-surface-container-low";
    resetRegistrationForm();
  }
}

function resetRegistrationForm() {
  const inputsWrapper = document.getElementById("registrationInputsWrapper");
  const otpWrapper = document.getElementById("otpValidationWrapper");
  if (inputsWrapper) inputsWrapper.classList.remove("hidden");
  if (otpWrapper) otpWrapper.classList.add("hidden");
  sessionStorage.removeItem("pendingVerificationSessionId");
  delete window.activeOtpSessionId;
}

// SMART FORM SUBMISSION ROUTER
function handleRegistrationFormSubmit(event) {
  event.preventDefault();
  const otpWrapper = document.getElementById("otpValidationWrapper");

  // If user is on the OTP screen and hits Enter, run OTP verification!
  if (otpWrapper && !otpWrapper.classList.contains("hidden")) {
    commitSecureOtpVerification();
  } else {
    executeUserRegistration();
  }
}

async function executeUserLogin(event) {
  if (event) event.preventDefault();
  const alertBanner = document.getElementById("authAlertBanner");

  const credentialInput = document.getElementById("loginCredentialField");
  const passwordInput = document.getElementById("loginPasswordField");

  if (!credentialInput || !passwordInput) return;

  const credential = credentialInput.value.trim();
  const password = passwordInput.value;

  if (!credential || !password) {
    alertBanner.innerText =
      "Please enter your username/email/mobile and password.";
    alertBanner.className =
      "mb-4 p-3 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200";
    alertBanner.classList.remove("hidden");
    return;
  }

  try {
    const response = await fetch("/api/auth/user/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential, password }),
    });

    const output = await response.json();

    if (!response.ok) {
      alertBanner.innerText = output.error || "Invalid credentials.";
      alertBanner.className =
        "mb-4 p-3 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200";
      alertBanner.classList.remove("hidden");
      return;
    }

    // Login Successful! Store Session Data
    const sessionPayload = output.userProfile || output.accountDetails;
    localStorage.setItem(
      "yojana_session_token",
      JSON.stringify(sessionPayload),
    );

    // Hide Modal & Update Navigation Bar State
    toggleAuthModal(false);
    renderNavbarAuthenticationState();

    // Update Scheme Modal CTAs if open
    if (typeof updateSchemeModalCTA === "function") {
      updateSchemeModalCTA();
    }

    // Reset Form Fields
    document.getElementById("portalLoginForm").reset();
  } catch (err) {
    alertBanner.innerText =
      "Network error attempting login. Please check server logs.";
    alertBanner.className =
      "mb-4 p-3 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200";
    alertBanner.classList.remove("hidden");
  }
}

async function executeUserRegistration() {
  const alertBanner = document.getElementById("authAlertBanner");
  const name = document.getElementById("regNameField").value.trim();
  const username = document.getElementById("regUsernameField").value.trim();
  const emailId = document.getElementById("regEmailField").value.trim();
  const mobileNumber = document.getElementById("regMobileField").value.trim();
  const password = document.getElementById("regPasswordField").value;

  if (!name || !username || !emailId || !mobileNumber || !password) {
    alertBanner.innerText =
      "All fields (Name, Username, Email, Mobile Number, Password) are mandatory.";
    alertBanner.className =
      "mb-4 p-3 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200";
    alertBanner.classList.remove("hidden");
    return;
  }

  try {
    const btn = document.getElementById("btnGenerateOtp");
    if (btn) btn.disabled = true;

    const response = await fetch("/api/auth/user/register/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, emailId, mobileNumber, password }),
    });

    const output = await response.json();
    if (btn) btn.disabled = false;

    if (!response.ok) {
      alertBanner.innerText = output.error || "Registration initiation failed.";
      alertBanner.className =
        "mb-4 p-3 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200";
      alertBanner.classList.remove("hidden");
      return;
    }

    // Store verification Session ID in both sessionStorage and window variable
    const sessionId = output.verificationSessionId;
    sessionStorage.setItem("pendingVerificationSessionId", sessionId);
    window.activeOtpSessionId = sessionId;

    // Switch UI view to OTP Input
    document
      .getElementById("registrationInputsWrapper")
      .classList.add("hidden");
    document.getElementById("otpValidationWrapper").classList.remove("hidden");

    alertBanner.innerText =
      output.message ||
      "Verification OTP generated! Check your terminal console or email.";
    alertBanner.className =
      "mb-4 p-3 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200";
    alertBanner.classList.remove("hidden");

    setTimeout(() => {
      const otpInput = document.getElementById("regOtpTokenField");
      if (otpInput) otpInput.focus();
    }, 150);
  } catch (err) {
    const btn = document.getElementById("btnGenerateOtp");
    if (btn) btn.disabled = false;
    alertBanner.innerText = "Network error initiating registration.";
    alertBanner.className =
      "mb-4 p-3 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200";
    alertBanner.classList.remove("hidden");
  }
}

async function commitSecureOtpVerification() {
  const alertBanner = document.getElementById("authAlertBanner");
  const verificationToken = document
    .getElementById("regOtpTokenField")
    .value.trim();

  // Retrieve Session ID
  const verificationSessionId =
    sessionStorage.getItem("pendingVerificationSessionId") ||
    window.activeOtpSessionId;

  if (!verificationSessionId) {
    alertBanner.innerText =
      'Session expired or server restarted. Click "Back to Registration Details" to re-generate OTP.';
    alertBanner.className =
      "mb-4 p-3 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200";
    alertBanner.classList.remove("hidden");
    return;
  }

  if (!verificationToken || verificationToken.length !== 6) {
    alertBanner.innerText = "Please enter a valid 6-digit OTP code.";
    alertBanner.className =
      "mb-4 p-3 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200";
    alertBanner.classList.remove("hidden");
    return;
  }

  try {
    const btn = document.getElementById("btnConfirmOtp");
    if (btn) btn.disabled = true;

    const response = await fetch("/api/auth/user/register/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verificationSessionId: verificationSessionId,
        verificationToken: verificationToken,
      }),
    });

    const output = await response.json();
    if (btn) btn.disabled = false;

    if (!response.ok) {
      alertBanner.innerText = output.error || "Invalid OTP code entered.";
      alertBanner.className =
        "mb-4 p-3 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200";
      alertBanner.classList.remove("hidden");
      return;
    }

    // Clean up session storage
    sessionStorage.removeItem("pendingVerificationSessionId");
    delete window.activeOtpSessionId;

    // Store user session token
    localStorage.setItem(
      "yojana_session_token",
      JSON.stringify(output.data || { name: "Citizen" }),
    );
    toggleAuthModal(false);
    renderNavbarAuthenticationState();

    if (typeof updateSchemeModalCTA === "function") {
      updateSchemeModalCTA();
    }
  } catch (err) {
    const btn = document.getElementById("btnConfirmOtp");
    if (btn) btn.disabled = false;
    alertBanner.innerText = "Network error verifying security OTP.";
    alertBanner.className =
      "mb-4 p-3 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200";
    alertBanner.classList.remove("hidden");
  }
}

function executeUserSignOut() {
  localStorage.removeItem("yojana_session_token");
  renderNavbarAuthenticationState();
  window.location.reload();
}
let resendCooldownTimer = null;

// ==================================================================
// RESEND EMAIL OTP HANDLER
// ==================================================================
async function resendOtpCode() {
  const resendBtn = document.getElementById("btnResendOtp");
  const alertBanner = document.getElementById("authAlertBanner");

  if (resendBtn && resendBtn.disabled) return;

  // Clear previous input code
  const otpInput = document.getElementById("regOtpTokenField");
  if (otpInput) otpInput.value = "";

  // Trigger OTP generation endpoint again
  await executeUserRegistration();

  // Start 30-Second Cooldown Timer
  startResendCooldown(30);
}

function startResendCooldown(seconds) {
  const resendBtn = document.getElementById("btnResendOtp");
  if (!resendBtn) return;

  let timeLeft = seconds;
  resendBtn.disabled = true;
  resendBtn.classList.add("opacity-50", "cursor-not-allowed");

  if (resendCooldownTimer) clearInterval(resendCooldownTimer);

  resendCooldownTimer = setInterval(() => {
    if (timeLeft <= 0) {
      clearInterval(resendCooldownTimer);
      resendBtn.disabled = false;
      resendBtn.classList.remove("opacity-50", "cursor-not-allowed");
      resendBtn.innerText = "Resend OTP";
    } else {
      resendBtn.innerText = `Resend OTP (${timeLeft}s)`;
      timeLeft--;
    }
  }, 1000);
}

// Reset form helper
function resetRegistrationForm() {
  const inputsWrapper = document.getElementById("registrationInputsWrapper");
  const otpWrapper = document.getElementById("otpValidationWrapper");
  const resendBtn = document.getElementById("btnResendOtp");

  if (inputsWrapper) inputsWrapper.classList.remove("hidden");
  if (otpWrapper) otpWrapper.classList.add("hidden");

  if (resendCooldownTimer) clearInterval(resendCooldownTimer);
  if (resendBtn) {
    resendBtn.disabled = false;
    resendBtn.classList.remove("opacity-50", "cursor-not-allowed");
    resendBtn.innerText = "Resend OTP";
  }

  sessionStorage.removeItem("pendingVerificationSessionId");
  delete window.activeOtpSessionId;
}
