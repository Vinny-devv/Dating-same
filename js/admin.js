// admin.js
// Private content dashboard. Gated entirely by watchAuth() — the dashboard
// markup is only ever shown to the signed-in admin account. Firestore
// rules are the real security boundary; this is just the UI for it.

import { db, IMGBB_API_KEY, IMGBB_UPLOAD_URL } from "./config.js";
import { signIn, signOutUser, watchAuth } from "./auth.js";
import { showToast, setLoading } from "./ui.js";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const els = {
  signinScreen: document.getElementById("signin-screen"),
  deniedScreen: document.getElementById("denied-screen"),
  dashboard: document.getElementById("dashboard"),
  googleSigninBtn: document.getElementById("google-signin-btn"),
  signoutBtn: document.getElementById("signout-btn"),
  signoutBtnDenied: document.getElementById("signout-btn-denied"),
  deniedMessage: document.getElementById("denied-message"),
  adminEmail: document.getElementById("admin-email"),
  sceneList: document.getElementById("scene-list"),
  newSceneBtn: document.getElementById("new-scene-btn"),
  editorTitle: document.getElementById("editor-title"),
  form: document.getElementById("scene-form"),
  sceneIdInput: document.getElementById("scene-id"),
  characterNameInput: document.getElementById("character-name"),
  dialogueInput: document.getElementById("dialogue-text"),
  imageUrlInput: document.getElementById("image-url"),
  imageUploadInput: document.getElementById("image-upload"),
  imagePreview: document.getElementById("image-preview"),
  backgroundUrlInput: document.getElementById("background-url"),
  isEndingInput: document.getElementById("is-ending"),
  choicesList: document.getElementById("choices-list"),
  addChoiceBtn: document.getElementById("add-choice-btn"),
  previewBtn: document.getElementById("preview-btn"),
  setStartBtn: document.getElementById("set-start-btn"),
  deleteBtn: document.getElementById("delete-btn"),
};
els.saveBtn = els.form.querySelector("button[type=submit]");

let scenesCache = new Map(); // sceneId -> scene data
let currentSceneId = null; // null while creating a brand-new scene
let startSceneId = null;

// ---------------------------------------------------------------------
// Auth gate
// ---------------------------------------------------------------------

watchAuth((user, isAdmin) => {
  if (!user) {
    showAuthScreen(els.signinScreen);
    return;
  }
  if (!isAdmin) {
    els.deniedMessage.textContent = `${user.email} doesn't have editor access on this project.`;
    showAuthScreen(els.deniedScreen);
    return;
  }
  els.adminEmail.textContent = user.email;
  showAuthScreen(els.dashboard);
  bootstrapDashboard();
});

function showAuthScreen(target) {
  [els.signinScreen, els.deniedScreen, els.dashboard].forEach((el) => {
    el.classList.toggle("hidden", el !== target);
  });
}

els.googleSigninBtn.addEventListener("click", () => {
  signIn().catch((e) => showToast(e.message, "error"));
});
els.signoutBtn.addEventListener("click", () => signOutUser());
els.signoutBtnDenied.addEventListener("click", () => signOutUser());

// ---------------------------------------------------------------------
// Bootstrapping
// ---------------------------------------------------------------------

async function bootstrapDashboard() {
  await Promise.all([loadStartSceneId(), loadSceneList()]);
  resetFormForNewScene();
}

async function loadStartSceneId() {
  try {
    const snap = await getDoc(doc(db, "gameConfig", "main"));
    startSceneId = snap.exists() ? snap.data().startSceneId : null;
  } catch (e) {
    console.error(e);
  }
}

async function loadSceneList() {
  els.sceneList.textContent = "";
  const loadingMsg = document.createElement("p");
  loadingMsg.className = "muted";
  loadingMsg.textContent = "Loading scenes…";
  els.sceneList.appendChild(loadingMsg);

  try {
    const snap = await getDocs(collection(db, "scenes"));
    scenesCache = new Map();
    snap.forEach((d) => scenesCache.set(d.id, d.data()));
    renderSceneList();
  } catch (e) {
    console.error(e);
    els.sceneList.textContent = "";
    const msg = document.createElement("p");
    msg.className = "muted";
    msg.textContent = "Couldn't load scenes.";
    els.sceneList.appendChild(msg);
  }
}

function renderSceneList() {
  els.sceneList.textContent = "";

  if (scenesCache.size === 0) {
    const msg = document.createElement("p");
    msg.className = "muted";
    msg.textContent = "No scenes yet. Create your first one.";
    els.sceneList.appendChild(msg);
    return;
  }

  [...scenesCache.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([id, data]) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "scene-list-item";
      item.classList.toggle("active", id === currentSceneId);

      const idSpan = document.createElement("span");
      idSpan.className = "scene-id";
      idSpan.textContent = id === startSceneId ? `★ ${id}` : id;

      const charSpan = document.createElement("span");
      charSpan.className = "scene-character";
      charSpan.textContent = data.characterName || "—";

      item.append(idSpan, charSpan);
      item.addEventListener("click", () => loadSceneIntoForm(id));
      els.sceneList.appendChild(item);
    });
}

els.newSceneBtn.addEventListener("click", resetFormForNewScene);

// ---------------------------------------------------------------------
// Form: new / load
// ---------------------------------------------------------------------

function resetFormForNewScene() {
  currentSceneId = null;
  els.editorTitle.textContent = "New scene";
  els.form.reset();
  els.sceneIdInput.disabled = false;
  els.imagePreview.classList.add("hidden");
  els.choicesList.textContent = "";
  addChoiceRow();
  els.deleteBtn.classList.add("hidden");
  els.setStartBtn.classList.add("hidden");
  els.previewBtn.classList.add("hidden");
  renderSceneList();
}

function loadSceneIntoForm(sceneId) {
  const data = scenesCache.get(sceneId);
  if (!data) return;

  currentSceneId = sceneId;
  els.editorTitle.textContent = sceneId;
  els.sceneIdInput.value = sceneId;
  els.sceneIdInput.disabled = true; // scene IDs are immutable once saved
  els.characterNameInput.value = data.characterName || "";
  els.dialogueInput.value = data.dialogue || "";
  els.imageUrlInput.value = data.imageUrl || "";
  els.backgroundUrlInput.value = data.backgroundUrl || "";
  els.isEndingInput.checked = !!data.isEnding;
  updateImagePreview(data.imageUrl);

  els.choicesList.textContent = "";
  const choices = Array.isArray(data.choices) ? data.choices : [];
  if (choices.length === 0) {
    addChoiceRow();
  } else {
    choices.forEach((c) => addChoiceRow(c.text, c.nextSceneId));
  }

  els.deleteBtn.classList.remove("hidden");
  els.setStartBtn.classList.remove("hidden");
  els.previewBtn.classList.remove("hidden");
  els.setStartBtn.textContent =
    sceneId === startSceneId ? "★ Opening scene" : "Set as opening scene";

  renderSceneList();
}

// ---------------------------------------------------------------------
// Choices (dynamic rows)
// ---------------------------------------------------------------------

function addChoiceRow(text = "", nextSceneId = "") {
  const row = document.createElement("div");
  row.className = "choice-row";

  const textInput = document.createElement("input");
  textInput.type = "text";
  textInput.placeholder = "Choice text shown to the player";
  textInput.value = text;
  textInput.className = "choice-text-input";

  const nextInput = document.createElement("input");
  nextInput.type = "text";
  nextInput.placeholder = "Next scene ID";
  nextInput.value = nextSceneId;
  nextInput.className = "choice-next-input";

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "btn btn-ghost btn-small";
  removeBtn.textContent = "Remove";
  removeBtn.addEventListener("click", () => row.remove());

  row.append(textInput, nextInput, removeBtn);
  els.choicesList.appendChild(row);
}

els.addChoiceBtn.addEventListener("click", () => addChoiceRow());

// ---------------------------------------------------------------------
// Image: URL field + ImgBB upload
// ---------------------------------------------------------------------

function updateImagePreview(url) {
  if (url) {
    els.imagePreview.src = url;
    els.imagePreview.classList.remove("hidden");
  } else {
    els.imagePreview.removeAttribute("src");
    els.imagePreview.classList.add("hidden");
  }
}

els.imageUrlInput.addEventListener("input", () => updateImagePreview(els.imageUrlInput.value));

els.imageUploadInput.addEventListener("change", async () => {
  const file = els.imageUploadInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("key", IMGBB_API_KEY);
  formData.append("image", file);

  showToast("Uploading image…", "info");
  try {
    const res = await fetch(IMGBB_UPLOAD_URL, { method: "POST", body: formData });
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || "Upload failed.");
    els.imageUrlInput.value = json.data.url;
    updateImagePreview(json.data.url);
    showToast("Image uploaded.", "success");
  } catch (e) {
    console.error(e);
    showToast(`Image upload failed: ${e.message}`, "error");
  } finally {
    els.imageUploadInput.value = "";
  }
});

// ---------------------------------------------------------------------
// Save / Delete / Set as opening scene / Preview
// ---------------------------------------------------------------------

els.form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const sceneId = els.sceneIdInput.value.trim();
  if (!sceneId) {
    showToast("Scene ID is required.", "error");
    return;
  }
  if (!currentSceneId && scenesCache.has(sceneId)) {
    showToast(`Scene "${sceneId}" already exists — choose a different ID.`, "error");
    return;
  }

  const choices = [...els.choicesList.querySelectorAll(".choice-row")]
    .map((row) => ({
      text: row.querySelector(".choice-text-input").value.trim(),
      nextSceneId: row.querySelector(".choice-next-input").value.trim(),
    }))
    .filter((c) => c.text && c.nextSceneId);

  const sceneData = {
    characterName: els.characterNameInput.value.trim(),
    dialogue: els.dialogueInput.value.trim(),
    imageUrl: els.imageUrlInput.value.trim(),
    backgroundUrl: els.backgroundUrlInput.value.trim(),
    isEnding: els.isEndingInput.checked,
    choices,
    updatedAt: serverTimestamp(),
  };

  setLoading(els.saveBtn, true);
  try {
    await setDoc(doc(db, "scenes", sceneId), sceneData);
    scenesCache.set(sceneId, sceneData);
    currentSceneId = sceneId;
    els.sceneIdInput.disabled = true;
    els.editorTitle.textContent = sceneId;
    els.deleteBtn.classList.remove("hidden");
    els.setStartBtn.classList.remove("hidden");
    els.previewBtn.classList.remove("hidden");
    renderSceneList();
    showToast("Scene saved.", "success");
  } catch (e) {
    console.error(e);
    showToast(`Couldn't save: ${e.message}`, "error");
  } finally {
    setLoading(els.saveBtn, false);
  }
});

els.deleteBtn.addEventListener("click", async () => {
  if (!currentSceneId) return;
  const confirmed = window.confirm(`Delete scene "${currentSceneId}"? This can't be undone.`);
  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "scenes", currentSceneId));
    scenesCache.delete(currentSceneId);
    showToast("Scene deleted.", "success");
    resetFormForNewScene();
  } catch (e) {
    console.error(e);
    showToast(`Couldn't delete: ${e.message}`, "error");
  }
});

els.setStartBtn.addEventListener("click", async () => {
  if (!currentSceneId) return;
  try {
    await setDoc(doc(db, "gameConfig", "main"), { startSceneId: currentSceneId }, { merge: true });
    startSceneId = currentSceneId;
    els.setStartBtn.textContent = "★ Opening scene";
    renderSceneList();
    showToast(`"${currentSceneId}" is now the opening scene.`, "success");
  } catch (e) {
    console.error(e);
    showToast(`Couldn't set opening scene: ${e.message}`, "error");
  }
});

els.previewBtn.addEventListener("click", () => {
  if (!currentSceneId) return;
  window.open(`./index.html#scene=${encodeURIComponent(currentSceneId)}`, "_blank");
});
