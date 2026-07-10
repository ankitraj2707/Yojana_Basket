function toggleSarthiPanel(open) {
  document
    .getElementById("sarthiWorkspacePanel")
    .classList.toggle("hidden", !open);
}

function handleSarthiKeyPress(e) {
  if (e.key === "Enter") processSarthiQueryTransmission();
}

async function processSarthiQueryTransmission() {
  const input = document.getElementById("sarthiQueryConsoleInput");
  const query = input.value.trim();
  if (!query) return;

  const stream = document.getElementById("sarthiChatConsoleStream");

  // Append the user's message bubble cleanly on the right
  stream.innerHTML += `<div class="bg-primary text-white p-2 rounded-lg ml-auto max-w-[85%] w-fit mb-2 shadow-sm">${query}</div>`;
  input.value = "";
  stream.scrollTop = stream.scrollHeight;

  // Append a temporary loading bubble placeholder
  const loadingId = "sarthi-loading-" + Date.now();
  stream.innerHTML += `<div id="${loadingId}" class="bg-white border p-2 rounded-lg max-w-[85%] w-fit mb-2 text-on-surface-variant italic animate-pulse">Yojana Mitra is analyzing...</div>`;
  stream.scrollTop = stream.scrollHeight;

  try {
    // Safely extract active user info if they are signed into the dashboard
    const activeSession =
      JSON.parse(localStorage.getItem("yojana_session_token")) || null;
    const profilePayload = activeSession ? activeSession.user : null;

    const res = await fetch("/api/assistant/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: query }],
        userProfile: profilePayload,
      }),
    });

    const data = await res.json();

    // Remove the temporary loading bubble
    document.getElementById(loadingId).remove();

    if (data.error) {
      stream.innerHTML += `<div class="bg-red-50 text-red-700 p-2 rounded-lg max-w-[85%] w-fit mb-2 border border-red-200">Error: ${data.error}</div>`;
    } else {
      // Replace newlines with breaks to display the markdown text correctly
      const formattedText = data.text.replace(/\n/g, "<br>");
      stream.innerHTML += `<div class="bg-white border p-2 rounded-lg max-w-[85%] w-fit mb-2 text-on-surface shadow-sm">${formattedText}</div>`;
    }
  } catch (e) {
    document.getElementById(loadingId).remove();
    stream.innerHTML += `<div class="bg-red-50 text-red-700 p-2 rounded-lg max-w-[85%] w-fit mb-2 border border-red-200">Network connection error with assistant pipeline.</div>`;
  }
  stream.scrollTop = stream.scrollHeight;
}
