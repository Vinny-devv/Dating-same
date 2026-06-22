// game.js
// The public-facing visual novel player. Knows nothing about auth or
// editing — it only ever reads from Firestore.

import { db } from "./config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Typewriter } from "./ui.js";

const els = {
  stage: document.getElementById("stage"),
  loading: document.getElementById("loading-screen"),
  error: document.getElementById("error-screen"),
  errorMessage: document.getElementById("error-message"),
  retryBtn: document.getElementById("retry-btn"),
  background: document.getElementById("scene-background"),
  characterImage: document.getElementById("character-image"),
  namePlate: document.getElementById("name-plate"),
  dialogueBox: document.getElementById("dialogue-box"),
  dialogueText: document.getElementById("dialogue-text"),
  choices: document.getElementById("choices"),
  endingPanel: document.getElementById("ending-panel"),
  restartBtn: document.getElementById("restart-btn"),
};

const typewriter = new Typewriter(els.dialogueText, 16);

function getSceneIdFromHash() {
  const match = window.location.hash.match(/scene=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function setSceneHash(sceneId) {
  window.location.hash = `scene=${encodeURIComponent(sceneId)}`;
}

async function getStartSceneId() {
  try {
    const snap = await getDoc(doc(db, "gameConfig", "main"));
    if (snap.exists() && snap.data().startSceneId) {
      return snap.data().startSceneId;
    }
  } catch (e) {
    console.warn("Couldn't read game config, defaulting to 'start'.", e);
  }
  return "start";
}

function showScreen(name) {
  els.loading.classList.toggle("hidden", name !== "loading");
  els.error.classList.toggle("hidden", name !== "error");
  els.stage.classList.toggle("hidden", name !== "stage");
}

function showError(message) {
  els.errorMessage.textContent = message;
  showScreen("error");
}

async function loadScene(sceneId) {
  showScreen("loading");
  try {
    const snap = await getDoc(doc(db, "scenes", sceneId));
    if (!snap.exists()) {
      showError(`This part of the story ("${sceneId}") hasn't been written yet.`);
      return;
    }
    renderScene(snap.data());
    showScreen("stage");
  } catch (e) {
    console.error(e);
    showError("Couldn't reach the story. Check your connection and try again.");
  }
}

function renderScene(data) {
  // Background art (optional — falls back to the CSS gradient).
  els.background.style.backgroundImage = data.backgroundUrl
    ? `url("${data.backgroundUrl}")`
    : "";

  // Character sprite.
  if (data.imageUrl) {
    els.characterImage.src = data.imageUrl;
    els.characterImage.classList.remove("hidden");
  } else {
    els.characterImage.removeAttribute("src");
    els.characterImage.classList.add("hidden");
  }

  // Name plate.
  els.namePlate.textContent = data.characterName || "";
  els.namePlate.classList.toggle("hidden", !data.characterName);

  // Dialogue, typed out.
  typewriter.start(data.dialogue || "");

  // Choices vs. ending.
  const choices = Array.isArray(data.choices)
    ? data.choices.filter((c) => c && c.nextSceneId)
    : [];

  if (data.isEnding || choices.length === 0) {
    els.choices.innerHTML = "";
    els.endingPanel.classList.remove("hidden");
  } else {
    els.endingPanel.classList.add("hidden");
    renderChoices(choices);
  }
}

function renderChoices(choices) {
  els.choices.innerHTML = "";
  choices.forEach((choice) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice-btn";
    btn.textContent = choice.text || "Continue";
    btn.addEventListener("click", () => setSceneHash(choice.nextSceneId));
    els.choices.appendChild(btn);
  });
}

// Click the dialogue box to fast-forward the typewriter, VN-style.
els.dialogueBox.addEventListener("click", () => {
  typewriter.skipToEnd();
});

els.retryBtn.addEventListener("click", () => {
  const id = getSceneIdFromHash();
  if (id) loadScene(id);
  else init();
});

els.restartBtn.addEventListener("click", async () => {
  const startId = await getStartSceneId();
  setSceneHash(startId);
});

window.addEventListener("hashchange", () => {
  const id = getSceneIdFromHash();
  if (id) loadScene(id);
});

async function init() {
  const existing = getSceneIdFromHash();
  if (existing) {
    loadScene(existing);
  } else {
    const startId = await getStartSceneId();
    setSceneHash(startId);
  }
}

init();
