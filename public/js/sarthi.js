/**
 * YojanaBasket - Sarthi AI Assistant Frontend Interface Module
 * High-Fidelity Edition with Adaptive Native Hindi Voice Matcher Core
 */

let activeSpeechSynthesisUtterance = null;

function toggleSarthiPanel(open) {
  document
    .getElementById("sarthiWorkspacePanel")
    .classList.toggle("hidden", !open);
  if (!open) {
    cancelVoiceAssistantAudioOutput();
  }
}

function handleSarthiKeyPress(e) {
  if (e.key === "Enter") processSarthiQueryTransmission();
}

async function processSarthiQueryTransmission() {
  const input = document.getElementById("sarthiQueryConsoleInput");
  const query = input.value.trim();
  if (!query) return;

  const stream = document.getElementById("sarthiChatConsoleStream");
  cancelVoiceAssistantAudioOutput();

  stream.innerHTML += `<div class="bg-primary text-white p-2 rounded-lg ml-auto max-w-[85%] w-fit mb-2 shadow-sm">${query}</div>`;
  input.value = "";
  stream.scrollTop = stream.scrollHeight;

  const loadingId = "sarthi-loading-" + Date.now();
  stream.innerHTML += `<div id="${loadingId}" class="bg-white border p-2 rounded-lg max-w-[85%] w-fit mb-2 text-on-surface-variant italic animate-pulse">Sarthi is analyzing...</div>`;
  stream.scrollTop = stream.scrollHeight;

  try {
    const activeSession =
      JSON.parse(localStorage.getItem("yojana_session_token")) || null;
    const profilePayload = activeSession
      ? activeSession.user || activeSession.userProfile
      : null;

    const res = await fetch("/api/assistant/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: query }],
        userProfile: profilePayload,
      }),
    });

    const data = await res.json();
    const loadNode = document.getElementById(loadingId);
    if (loadNode) loadNode.remove();

    if (data.error) {
      stream.innerHTML += `<div class="bg-red-50 text-red-700 p-2 rounded-lg max-w-[85%] w-fit mb-2 border border-red-200">Error: ${data.error}</div>`;
    } else {
      const formattedText = data.text.replace(/\n/g, "<br>");
      const rawCleanMessageText = data.text;
      const bubbleElementId = "msg-bubble-" + Date.now();

      stream.innerHTML += `
                <div class="bg-white border p-2 rounded-lg max-w-[85%] w-fit mb-2 text-on-surface shadow-sm flex flex-col gap-1.5" id="${bubbleElementId}">
                    <div class="text-xs">${formattedText}</div>
                    <div class="flex items-center justify-end border-t pt-1 mt-0.5">
                        <button onclick="speakVoiceAssistantAudioOutput(\`${bubbleElementId}-raw\`, this)" class="text-primary/70 hover:text-primary transition-colors flex items-center gap-1 text-[10px] font-bold" title="Listen to response">
                            <span class="material-symbols-outlined text-sm">volume_up</span>
                            Listen
                        </button>
                        <span id="${bubbleElementId}-raw" class="hidden">${rawCleanMessageText}</span>
                    </div>
                </div>
            `;

      setTimeout(() => {
        const targetBubbleNode = document.getElementById(bubbleElementId);
        if (targetBubbleNode) {
          const inlineSpeakerBtn = targetBubbleNode.querySelector("button");
          speakVoiceAssistantAudioOutput(
            `${bubbleElementId}-raw`,
            inlineSpeakerBtn,
          );
        }
      }, 100);
    }
  } catch (e) {
    const loadNode = document.getElementById(loadingId);
    if (loadNode) loadNode.remove();
    stream.innerHTML += `<div class="bg-red-50 text-red-700 p-2 rounded-lg max-w-[85%] w-fit mb-2 border border-red-200">Network connection error with assistant pipeline.</div>`;
  }
  stream.scrollTop = stream.scrollHeight;
}

function stripMarkdownSymbolsForAudio(text) {
  return text
    .replace(/[#*`_-]/g, " ")
    .replace(/<br>/g, " ")
    .trim();
}

// ==================================================================
// HIGH-FIDELITY BILINGUAL AUDIO MATCHING UTILITIES
// ==================================================================

function speakVoiceAssistantAudioOutput(rawTextNodeId, buttonElement) {
  const speechTextSource = document.getElementById(rawTextNodeId)?.innerText;
  if (!speechTextSource) return;

  const cleanAudioTextPayload = stripMarkdownSymbolsForAudio(speechTextSource);

  if (
    window.speechSynthesis.speaking &&
    activeSpeechSynthesisUtterance &&
    activeSpeechSynthesisUtterance.text === cleanAudioTextPayload
  ) {
    cancelVoiceAssistantAudioOutput();
    if (buttonElement) {
      buttonElement.innerHTML = `<span class="material-symbols-outlined text-sm">volume_up</span>Listen`;
    }
    return;
  }

  cancelVoiceAssistantAudioOutput();

  activeSpeechSynthesisUtterance = new SpeechSynthesisUtterance(
    cleanAudioTextPayload,
  );
  const currentLangSetting = localStorage.getItem("yojana_lang") || "en";

  // Fetch all voice engines loaded natively by the host operating system
  const systemVoiceBank = window.speechSynthesis.getVoices();
  let selectedNativeVoice = null;

  if (currentLangSetting === "hi") {
    activeSpeechSynthesisUtterance.lang = "hi-IN";
    // FIXED WORKFLOW: Scan specifically for real Indian Hindi voice profiles
    selectedNativeVoice = systemVoiceBank.find(
      (voice) => voice.lang.includes("hi-IN") || voice.lang.includes("hi_IN"),
    );
    // Comfortable cadence profile adjustments for natural Hindi accents
    activeSpeechSynthesisUtterance.rate = 0.9;
    activeSpeechSynthesisUtterance.pitch = 1.05;
  } else {
    activeSpeechSynthesisUtterance.lang = "en-IN";
    // Scan specifically for standard Indian English profiles
    selectedNativeVoice = systemVoiceBank.find(
      (voice) =>
        voice.lang.includes("en-IN") ||
        voice.name.toLowerCase().includes("india"),
    );
    activeSpeechSynthesisUtterance.rate = 1.0;
    activeSpeechSynthesisUtterance.pitch = 1.0;
  }

  // Force application of matched native driver profile if successfully uncovered
  if (selectedNativeVoice) {
    activeSpeechSynthesisUtterance.voice = selectedNativeVoice;
  }

  activeSpeechSynthesisUtterance.onstart = () => {
    if (buttonElement) {
      buttonElement.innerHTML = `<span class="material-symbols-outlined text-sm text-red-600 animate-pulse">stop_circle</span>Stop`;
      buttonElement.classList.add("text-red-600");
    }
  };

  activeSpeechSynthesisUtterance.onend = () => {
    if (buttonElement) {
      buttonElement.innerHTML = `<span class="material-symbols-outlined text-sm">volume_up</span>Listen`;
      buttonElement.classList.remove("text-red-600");
    }
    activeSpeechSynthesisUtterance = null;
  };

  activeSpeechSynthesisUtterance.onerror = () => {
    if (buttonElement) {
      buttonElement.innerHTML = `<span class="material-symbols-outlined text-sm">volume_up</span>Listen`;
      buttonElement.classList.remove("text-red-600");
    }
    activeSpeechSynthesisUtterance = null;
  };

  window.speechSynthesis.speak(activeSpeechSynthesisUtterance);
}

function cancelVoiceAssistantAudioOutput() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// Pre-trigger voice loading stack (Chrome/Edge asynchronous initialization workaround)
if (window.speechSynthesis.onvoiceschanged !== undefined) {
  window.speechSynthesis.onvoiceschanged = () =>
    window.speechSynthesis.getVoices();
}
