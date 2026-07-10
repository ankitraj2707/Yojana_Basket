const AUTH_BASE_ROUTE = "/api/auth/user";
let activeVerificationSessionTokenId = null;

document.addEventListener("DOMContentLoaded", () => {
  evaluateHeaderAuthStateUI();
});

function toggleAuthModal(display, tab = "LOGIN") {
  const modal = document.getElementById("authOverlayModal");
  if (display) {
    modal.classList.remove("hidden");
    switchAuthTab(tab);
  } else {
    modal.classList.add("hidden");
  }
}

function switchAuthTab(target) {
  const loginForm = document.getElementById("portalLoginForm");
  const registerForm = document.getElementById("portalRegisterForm");
  const tabLogin = document.getElementById("tabLoginBtn");
  const tabRegister = document.getElementById("tabRegisterBtn");
  document.getElementById("authAlertBanner").classList.add("hidden");

  if (target === "LOGIN") {
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    tabLogin.className =
      "w-1/2 py-3 text-sm font-bold text-primary border-b-2 border-primary bg-white";
    tabRegister.className =
      "w-1/2 py-3 text-sm font-semibold text-on-surface-variant";
  } else {
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    tabLogin.className =
      "w-1/2 py-3 text-sm font-semibold text-on-surface-variant";
    tabRegister.className =
      "w-1/2 py-3 text-sm font-bold text-primary border-b-2 border-primary bg-white";
  }
}

function triggerAuthMessage(text, type) {
  const banner = document.getElementById("authAlertBanner");
  banner.innerText = text;
  banner.className = `mb-4 p-3 rounded-lg text-xs font-medium ${type === "ERROR" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`;
}

async function executeUserLogin(event) {
  event.preventDefault();
  const credential = document.getElementById("loginCredentialField").value;
  const password = document.getElementById("loginPasswordField").value;
  try {
    const response = await fetch(`${AUTH_BASE_ROUTE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential, password }),
    });
    const output = await response.json();
    if (!response.ok) return triggerAuthMessage(output.error, "ERROR");

    localStorage.setItem(
      "yojana_session_token",
      JSON.stringify(output.accountDetails),
    );
    window.location.href = "/dashboard.html";
  } catch (err) {
    triggerAuthMessage(
      "Network transit fault during server data processing stream.",
      "ERROR",
    );
  }
}

// User Registration Phase 1: Fire parameters into security memory hold stage
async function executeUserRegistration(event) {
  event.preventDefault(); // cite: 134

  const name = document.getElementById("regNameField").value; // cite: 134
  const username = document.getElementById("regUsernameField").value; // cite: 134
  const mobileNumber = document.getElementById("regMobileField").value; // cite: 134
  const password = document.getElementById("regPasswordField").value; // cite: 134

  // ADAPTIVE STEP FOR RURAL ACCESSIBILITY:
  // Safely pull the email value, but if it's blank or empty, fallback to null
  const emailInput = document.getElementById("regEmailField").value.trim();
  const emailId = emailInput !== "" ? emailInput : null;

  try {
    const response = await fetch("/api/auth/user/register/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, emailId, mobileNumber, password }), // cite: 134
    });

    const output = await response.json();

    if (!response.ok) {
      triggerAuthMessage(
        output.error || "Registration validation rejected parameters.",
        "ERROR",
      ); // cite: 134
      return;
    }

    // Cache tracking session token address details
    activeVerificationSessionTokenId = output.verificationSessionId;

    // Transition UI display smoothly to OTP collection frame stack
    document
      .getElementById("registrationInputsWrapper")
      .classList.add("hidden");
    document.getElementById("otpValidationWrapper").classList.remove("hidden");

    triggerAuthMessage(
      `SMS code dispatched to +91 ${mobileNumber}! Check your phone.`,
      "SUCCESS",
    );
  } catch (err) {
    triggerAuthMessage(
      "Transit interface block connecting registration pipeline gateways.",
      "ERROR",
    ); // cite: 134
  }
}
async function commitSecureOtpVerification() {
  const inputOtpToken = document
    .getElementById("regOtpTokenField")
    .value.trim();
  if (inputOtpToken.length !== 6)
    return triggerAuthMessage(
      "Please enter a valid 6-digit numeric OTP token.",
      "ERROR",
    );
  try {
    const response = await fetch(`${AUTH_BASE_ROUTE}/register/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verificationSessionId: activeVerificationSessionTokenId,
        inputOtpToken,
      }),
    });
    const output = await response.json();
    if (!response.ok) return triggerAuthMessage(output.error, "ERROR");

    triggerAuthMessage(
      "Security token verified! Account created cleanly.",
      "SUCCESS",
    );
    setTimeout(() => {
      document
        .getElementById("registrationInputsWrapper")
        .classList.remove("hidden");
      document.getElementById("otpValidationWrapper").classList.add("hidden");
      switchAuthTab("LOGIN");
      document.getElementById("loginCredentialField").value =
        document.getElementById("regUsernameField").value;
    }, 1200);
  } catch (e) {
    triggerAuthMessage(
      "Network error processing OTP validation sequence.",
      "ERROR",
    );
  }
}

function evaluateHeaderAuthStateUI() {
  const node = document.getElementById("navAuthLinks");
  if (!node) return;
  const token = JSON.parse(localStorage.getItem("yojana_session_token"));
  if (token) {
    node.innerHTML = `<button onclick="window.location.href='/dashboard.html'" class="text-sm font-bold text-primary">Workspace Dashboard</button>`;
  } else {
    node.innerHTML = `<button onclick="toggleAuthModal(true, 'LOGIN')" class="text-sm font-semibold text-on-surface-variant">Sign In</button>
        <button onclick="toggleAuthModal(true, 'REGISTER')" class="bg-primary text-white text-xs font-bold px-5 py-2.5 rounded-full">Register Gateway</button>`;
  }
}

function terminateActiveSession() {
  localStorage.removeItem("yojana_session_token");
  window.location.href = "/";
}
