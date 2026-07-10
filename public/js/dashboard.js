let user = null;
document.addEventListener("DOMContentLoaded", () => {
  user = JSON.parse(localStorage.getItem("yojana_session_token"));
  if (!user) {
    window.location.href = "/";
    return;
  }
  document.getElementById("dashboardUserBadge").innerText = `${user.username}`;
  triggerBackgroundMatchEvaluation(user.username);
});

async function triggerBackgroundMatchEvaluation(username, overrides = null) {
  const container = document.getElementById("recommendedSchemesContainer");
  try {
    const res = await fetch("/api/schemes/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, profileOverrides: overrides }),
    });
    const data = await res.json();
    document.getElementById("recommendationCounter").innerText =
      data.matchCount;

    if (!overrides) {
      document.getElementById("profAge").value =
        data.autofilledProfile.age || "";
      document.getElementById("profGender").value =
        data.autofilledProfile.gender || "Male";
      document.getElementById("profState").value =
        data.autofilledProfile.state || "";
      document.getElementById("profCaste").value =
        data.autofilledProfile.caste || "General";
      document.getElementById("profIncome").value =
        data.autofilledProfile.annualIncome || "";
      document.getElementById("profOccupation").value =
        data.autofilledProfile.occupation || "";
      document.getElementById("profDisability").checked =
        data.autofilledProfile.disability || false;
    }

    if (data.eligibleSchemes.length === 0) {
      container.innerHTML = `<div class="text-xs text-center border p-6 rounded-xl text-on-surface-variant">No listings pass demographic matrix boundaries. Try modifying input values.</div>`;
      return;
    }

    container.innerHTML = data.eligibleSchemes
      .map(
        (s) => `
            <div class="bg-white border-l-4 border-l-green-700 border p-5 rounded-xl shadow-sm space-y-2">
                <h4 class="font-bold text-primary">${s.name} <span class="text-xs font-normal">(${s.hindiName})</span></h4>
                <p class="text-xs text-on-surface-variant">${s.description}</p>
                <div class="text-[11px] font-semibold text-secondary">Benefits: ${s.benefits}</div>
            </div>
        `,
      )
      .join("");
  } catch (e) {
    container.innerHTML = `<div class="text-sm text-red-600">Failed to connect to recommendation registry loops.</div>`;
  }
}

function commitProfileParameters(e) {
  e.preventDefault();
  const payload = {
    age: parseInt(document.getElementById("profAge").value),
    gender: document.getElementById("profGender").value,
    state: document.getElementById("profState").value,
    caste: document.getElementById("profCaste").value,
    annualIncome: parseFloat(document.getElementById("profIncome").value),
    occupation: document.getElementById("profOccupation").value,
    disability: document.getElementById("profDisability").checked,
  };
  triggerBackgroundMatchEvaluation(user.username, payload);
}
