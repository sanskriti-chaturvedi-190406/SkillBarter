
"use strict";

/*
 * SkillBarter Skills — Local Demo Adapter
 *
 * Uses the same keys as verification/admin.js.
 * This does not create real Convex documents.
 * Replace this adapter with authenticated Convex
 * queries/mutations during backend integration.
 */

const SKILLS_KEY = "skillbarter_member3_skills";
const PROOFS_KEY = "skillbarter_member3_proofs";

const MAX_OUTCOMES = 2;
const MAX_FREE_LEARNING_GOALS = 2;

const CATALOGUE = {
  Programming: [
    "JavaScript", "Python", "Java", "C++",
    "HTML & CSS", "React", "SQL"
  ],
  Design: [
    "UI/UX Design", "Graphic Design",
    "Figma", "Illustration", "Pixel Art"
  ],
  Languages: [
    "English", "Hindi", "Spanish", "French"
  ],
  Business: [
    "Marketing", "Public Speaking",
    "Entrepreneurship", "Excel"
  ],
  Creative: [
    "Photography", "Video Editing",
    "Creative Writing", "Music"
  ],
  Other: []
};

const $ = (id) => document.getElementById(id);

let editingSkillId = null;
let activeProofSkillId = null;
let lastFocusedElement = null;

/* STORAGE */

function readArray(key) {
  try {
    const value = JSON.parse(
      localStorage.getItem(key) || "[]"
    );
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.error("Storage read failed:", error);
    return [];
  }
}

function saveArray(key, records) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(records)
    );
    return true;
  } catch (error) {
    console.error("Storage write failed:", error);
    return false;
  }
}

function getSkills() {
  return readArray(SKILLS_KEY);
}

function getProofs() {
  return readArray(PROOFS_KEY);
}

function getId(record) {
  return String(record?._id ?? record?.id ?? "");
}

function demoId() {
  return crypto.randomUUID();
}

function normalizeStatus(value) {
  const status = String(value ?? "").toLowerCase();

  if (status === "pending") return "submitted";
  if (status === "approved") return "verified";

  return [
    "unverified", "submitted", "under_review",
    "verified", "rejected"
  ].includes(status)
    ? status
    : "unverified";
}

function getTime(value) {
  if (typeof value === "number") return value;

  if (typeof value === "string") {
    const numeric = Number(value);
    if (value.trim() && Number.isFinite(numeric)) {
      return numeric;
    }
    return Date.parse(value) || 0;
  }

  return 0;
}

function getOutcomes(skill) {
  if (Array.isArray(skill.learningOutcomes)) {
    return skill.learningOutcomes
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof skill.learningOutcome === "string") {
    return skill.learningOutcome.trim()
      ? [skill.learningOutcome.trim()]
      : [];
  }

  return [];
}

function latestProof(skillId, proofs = getProofs()) {
  return proofs
    .filter(
      (proof) =>
        String(proof.userSkillId) === String(skillId)
    )
    .sort(
      (a, b) =>
        getTime(b.createdAt) - getTime(a.createdAt)
    )[0] || null;
}

/* UI HELPERS */

function element(tag, content = "", className = "") {
  const node = document.createElement(tag);
  node.textContent = String(content ?? "");
  if (className) node.className = className;
  return node;
}

function setMessage(id, value, error = false) {
  const node = $(id);
  if (!node) return;

  node.textContent = value;
  node.className = error
    ? "message error"
    : "message success";
}

function empty(container, message) {
  container.replaceChildren(
    element("div", message, "empty")
  );
}

function addTag(parent, label, status = "") {
  parent.appendChild(
    element("span", label, "tag " + status)
  );
}

function addOutcomes(parent, skill) {
  const outcomes = getOutcomes(skill);
  if (!outcomes.length) return;

  const box = element("div", "", "learning-outcome");
  box.appendChild(
    element("strong", "Learning Outcomes")
  );

  const list = document.createElement("ul");

  outcomes.forEach((outcome) => {
    list.appendChild(element("li", outcome));
  });

  box.appendChild(list);
  parent.appendChild(box);
}

function addButton(parent, label, action, skillId, danger = false) {
  const button = element(
    "button",
    label,
    danger ? "small-btn danger" : "small-btn"
  );

  button.type = "button";
  button.dataset.action = action;
  button.dataset.skillId = skillId;
  parent.appendChild(button);
}

function createSkillCard(skill, mode) {
  const id = getId(skill);
  const status = normalizeStatus(
    skill.verificationStatus
  );

  const card = element(
    "article",
    "",
    "card " + (skill.type === "learn" ? "learn" : status)
  );

  card.appendChild(
    element("h4", skill.name || "Unnamed Skill")
  );

  const tags = element("div", "", "tags");
  addTag(tags, skill.category || "Other");
  addTag(tags, skill.proficiency || "Not specified");

  if (skill.type === "teach") {
    addTag(tags, status.replaceAll("_", " "), status);
  }

  card.appendChild(tags);

  if (skill.description) {
    card.appendChild(element("p", skill.description));
  }

  addOutcomes(card, skill);

  const actions = element("div", "", "actions");

  if (mode === "verification") {
    if (status === "unverified" || status === "rejected") {
      addButton(
        actions,
        status === "rejected"
          ? "Resubmit Proof"
          : "Submit Proof",
        "proof",
        id
      );
    }

    if (status === "submitted" || status === "under_review") {
      actions.appendChild(
        element("p", "Awaiting admin review.")
      );
    }

    if (status === "rejected") {
      const proof = latestProof(id);
      if (proof?.adminComment) {
        actions.appendChild(
          element(
            "p",
            "Reason: " + proof.adminComment
          )
        );
      }
    }
  }

  if (
    mode === "learning" ||
    (mode === "verification" &&
      status !== "submitted" &&
      status !== "under_review")
  ) {
    addButton(actions, "Edit", "edit", id);
    addButton(actions, "Remove", "remove", id, true);
  }

  card.appendChild(actions);
  return card;
}

/* CATALOGUE */

function initializeCatalogue() {
  const categorySelect = $("category");

  Object.keys(CATALOGUE).forEach((category) => {
    const option = new Option(category, category);
    categorySelect.add(option);
  });

  categorySelect.addEventListener(
    "change",
    updateSkillOptions
  );

  $("skillName").addEventListener(
    "change",
    updateCustomSkillVisibility
  );
}

function updateSkillOptions() {
  const category = $("category").value;
  const skillSelect = $("skillName");

  skillSelect.replaceChildren(
    new Option(
      category ? "Choose skill" : "Choose category first",
      ""
    )
  );

  skillSelect.disabled = !category;

  if (category) {
    (CATALOGUE[category] || []).forEach((name) => {
      skillSelect.add(new Option(name, name));
    });

    skillSelect.add(
      new Option("+ Custom Skill", "__custom__")
    );
  }

  updateCustomSkillVisibility();
}

function updateCustomSkillVisibility() {
  const isCustom =
    $("skillName").value === "__custom__";

  $("customSkillBox").hidden = !isCustom;
  $("customSkill").required = isCustom;

  if (!isCustom) $("customSkill").value = "";
}

/* LEARNING OUTCOMES */

function updateOutcomeButton() {
  $("addOutcomeButton").disabled =
    $("outcomesContainer").children.length >= MAX_OUTCOMES;
}

function addOutcomeRow(value = "") {
  const container = $("outcomesContainer");

  if (container.children.length >= MAX_OUTCOMES) {
    return;
  }

  const row = element("div", "", "outcome-row");

  const input = document.createElement("textarea");
  input.className = "outcome-input";
  input.rows = 2;
  input.maxLength = 200;
  input.placeholder = "Describe an expected outcome";
  input.value = value;
  input.setAttribute("aria-label", "Learning outcome");

  const remove = element(
    "button",
    "Remove",
    "outcome-remove"
  );
  remove.type = "button";

  remove.addEventListener("click", () => {
    row.remove();
    updateOutcomeButton();
  });

  row.append(input, remove);
  container.appendChild(row);

  updateOutcomeButton();
}

function readOutcomeInputs() {
  return [...document.querySelectorAll(
    "#outcomesContainer .outcome-input"
  )]
    .map((input) => input.value.trim())
    .filter(Boolean);
}

$("addOutcomeButton").addEventListener(
  "click",
  () => addOutcomeRow()
);

/* SKILL FORM */

function resetSkillForm() {
  $("skillForm").reset();

  editingSkillId = null;

  $("formTitle").textContent = "Equip a New Skill";
  $("saveButton").textContent = "SAVE SKILL";
  $("cancelButton").hidden = true;

  $("outcomesContainer").replaceChildren();
  updateOutcomeButton();

  updateSkillOptions();
  setMessage("formMessage", "");
}

function editSkill(skillId) {
  const skill = getSkills().find(
    (item) => getId(item) === skillId
  );

  if (!skill) return;

  editingSkillId = skillId;

  $("category").value = skill.category || "Other";
  updateSkillOptions();

  const select = $("skillName");

  const exists = [...select.options].some(
    (option) => option.value === skill.name
  );

  select.value = exists ? skill.name : "__custom__";

  updateCustomSkillVisibility();

  if (!exists) {
    $("customSkill").value = skill.name || "";
  }

  document.querySelectorAll(
    'input[name="skillType"]'
  ).forEach((radio) => {
    radio.checked = radio.value === skill.type;
  });

  $("proficiency").value = skill.proficiency || "";
  $("skillDescription").value = skill.description || "";

  $("outcomesContainer").replaceChildren();

  getOutcomes(skill).slice(0, MAX_OUTCOMES).forEach(
    (outcome) => addOutcomeRow(outcome)
  );

  updateOutcomeButton();

  $("formTitle").textContent = "Edit Skill";
  $("saveButton").textContent = "UPDATE SKILL";
  $("cancelButton").hidden = false;

  $("skillEditor").scrollIntoView({
    behavior: "smooth"
  });
}

function saveSkill(event) {
  event.preventDefault();

  const category = $("category").value;

  const selectedName = $("skillName").value;

  const name = selectedName === "__custom__"
    ? $("customSkill").value.trim()
    : selectedName;

  const type = document.querySelector(
    'input[name="skillType"]:checked'
  )?.value;

  const proficiency = $("proficiency").value;
  const description = $("skillDescription").value.trim();
  const learningOutcomes = readOutcomeInputs();

  if (!category || !name || !type || !proficiency) {
    setMessage(
      "formMessage",
      "Please complete all required fields.",
      true
    );
    return;
  }

  if (
    learningOutcomes.length > MAX_OUTCOMES ||
    learningOutcomes.some(
      (outcome) => outcome.length > 200
    )
  ) {
    setMessage(
      "formMessage",
      "Use a maximum of two outcomes, 200 characters each.",
      true
    );
    return;
  }

  const skills = getSkills();
  const previous = skills.find(
    (item) => getId(item) === editingSkillId
  );

  if (
    previous &&
    previous.type === "teach" &&
    ["submitted", "under_review"].includes(
      normalizeStatus(previous.verificationStatus)
    )
  ) {
    setMessage(
      "formMessage",
      "You cannot edit a skill while its proof is under review.",
      true
    );
    return;
  }

  const duplicate = skills.some(
    (item) =>
      getId(item) !== editingSkillId &&
      item.type === type &&
      item.name?.toLowerCase() === name.toLowerCase()
  );

  if (duplicate) {
    setMessage(
      "formMessage",
      "This skill is already in your inventory.",
      true
    );
    return;
  }

  const learningCount = skills.filter(
    (item) =>
      item.type === "learn" &&
      getId(item) !== editingSkillId
  ).length;

  // Demo assumes free tier.
  // Real subscriptionTier must come from backend.
  if (
    type === "learn" &&
    learningCount >= MAX_FREE_LEARNING_GOALS
  ) {
    setMessage(
      "formMessage",
      "Free users can have at most two learning goals.",
      true
    );
    return;
  }

  const now = Date.now();

  const nextSkill = {
    ...(previous || {}),
    id: previous ? getId(previous) : demoId(),
    name,
    category,
    type,
    proficiency,
    description,
    learningOutcomes,
    verificationStatus:
      type === "learn"
        ? "unverified"
        : previous?.type === "teach"
          ? normalizeStatus(previous.verificationStatus)
          : "unverified",
    createdAt: previous
      ? getTime(previous.createdAt) || now
      : now,
    updatedAt: now
  };

  /*
   * Demo-only fields:
   * id, name, category
   *
   * Real Convex userSkills require:
   * userId, skillId, type, proficiency, description,
   * learningOutcomes, verificationStatus, timestamps.
   *
   * skillId must reference a skills catalogue document.
   * userId must come from the authenticated backend user.
   */
  const updated = previous
    ? skills.map((item) =>
        getId(item) === editingSkillId
          ? nextSkill
          : item
      )
    : [...skills, nextSkill];

  if (!saveArray(SKILLS_KEY, updated)) {
    setMessage(
      "formMessage",
      "Unable to save skill.",
      true
    );
    return;
  }

  resetSkillForm();
  renderAll();

  setMessage("formMessage", "Skill saved successfully.");
}

function removeSkill(skillId) {
  const skills = getSkills();
  const skill = skills.find(
    (item) => getId(item) === skillId
  );

  if (!skill) return;

  if (
    skill.type === "teach" &&
    ["submitted", "under_review"].includes(
      normalizeStatus(skill.verificationStatus)
    )
  ) {
    alert("Cannot remove a skill under review.");
    return;
  }

  if (!confirm("Remove this skill from your inventory?")) {
    return;
  }

  const proofs = getProofs();

  if (
    proofs.some(
      (proof) =>
        String(proof.userSkillId) === skillId
    )
  ) {
    alert(
      "This skill has verification history. " +
      "Removing it requires a backend policy for preserving proofs."
    );
    return;
  }

  if (
    !saveArray(
      SKILLS_KEY,
      skills.filter((item) => getId(item) !== skillId)
    )
  ) {
    alert("Unable to remove skill.");
    return;
  }

  renderAll();
}

/* PROOF MODAL */

function openProofModal(skillId) {
  const skill = getSkills().find(
    (item) => getId(item) === skillId
  );

  if (!skill || skill.type !== "teach") return;

  const status = normalizeStatus(
    skill.verificationStatus
  );

  if (["submitted", "under_review", "verified"].includes(status)) {
    return;
  }

  activeProofSkillId = skillId;
  lastFocusedElement = document.activeElement;

  $("proofForm").reset();
  $("proofSkillLabel").textContent = skill.name;
  setMessage("proofMessage", "");

  $("proofModal").hidden = false;
  document.body.classList.add("modal-open");
  $("proofType").focus();
}

function closeProofModal() {
  $("proofModal").hidden = true;
  document.body.classList.remove("modal-open");
  activeProofSkillId = null;

  if (lastFocusedElement?.focus) {
    lastFocusedElement.focus();
  }
}

function submitProof(event) {
  event.preventDefault();

  const skillId = activeProofSkillId;
  const skill = getSkills().find(
    (item) => getId(item) === skillId
  );

  if (!skill || skill.type !== "teach") {
    setMessage(
      "proofMessage",
      "Teaching skill not found.",
      true
    );
    return;
  }

  const status = normalizeStatus(
    skill.verificationStatus
  );

  if (!["unverified", "rejected"].includes(status)) {
    setMessage(
      "proofMessage",
      "This skill is not eligible for a new submission.",
      true
    );
    return;
  }

  const type = $("proofType").value;
  const title = $("proofTitle").value.trim();
  const description = $("proofDescription").value.trim();
  const externalUrl = $("proofUrl").value.trim();

  let url;

  try {
    url = new URL(externalUrl);
  } catch {
    setMessage(
      "proofMessage",
      "Enter a valid evidence URL.",
      true
    );
    return;
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    !type ||
    !title ||
    !description
  ) {
    setMessage(
      "proofMessage",
      "Complete all proof fields and provide an HTTP(S) URL.",
      true
    );
    return;
  }

  const now = Date.now();

  const proof = {
    id: demoId(),
    userSkillId: skillId,
    type,
    title,
    description,
    externalUrl: url.href,
    status: "submitted",
    createdAt: now
  };

  const proofs = getProofs();
  const skills = getSkills();

  if (!saveArray(PROOFS_KEY, [...proofs, proof])) {
    setMessage(
      "proofMessage",
      "Unable to save proof.",
      true
    );
    return;
  }

  const updatedSkills = skills.map((item) =>
    getId(item) === skillId
      ? {
          ...item,
          verificationStatus: "submitted",
          updatedAt: now
        }
      : item
  );

  if (!saveArray(SKILLS_KEY, updatedSkills)) {
    // Best-effort rollback for demo storage.
    saveArray(PROOFS_KEY, proofs);
    setMessage(
      "proofMessage",
      "Unable to update skill status.",
      true
    );
    return;
  }

  closeProofModal();
  renderAll();

  alert("Proof submitted for admin review.");
}

/* RENDER */

function renderAll() {
  const skills = getSkills();

  const verified = skills.filter(
    (skill) =>
      skill.type === "teach" &&
      normalizeStatus(skill.verificationStatus) === "verified"
  );

  const learning = skills.filter(
    (skill) => skill.type === "learn"
  );

  const verification = skills.filter(
    (skill) =>
      skill.type === "teach" &&
      normalizeStatus(skill.verificationStatus) !== "verified"
  );

  const pending = verification.filter(
    (skill) =>
      ["submitted", "under_review"].includes(
        normalizeStatus(skill.verificationStatus)
      )
  );

  $("teachCount").textContent = verified.length;
  $("learnCount").textContent = learning.length;
  $("pendingCount").textContent = pending.length;

  const queue = $("verificationList");
  const teaching = $("teachingList");
  const learningList = $("learningList");

  queue.replaceChildren();
  teaching.replaceChildren();
  learningList.replaceChildren();

  if (!verification.length) {
    empty(queue, "No skills awaiting verification.");
  } else {
    verification.forEach(
      (skill) =>
        queue.appendChild(
          createSkillCard(skill, "verification")
        )
    );
  }

  if (!verified.length) {
    empty(teaching, "No verified teaching skills yet.");
  } else {
    verified.forEach(
      (skill) =>
        teaching.appendChild(
          createSkillCard(skill, "teaching")
        )
    );
  }

  if (!learning.length) {
    empty(learningList, "No learning goals yet.");
  } else {
    learning.forEach(
      (skill) =>
        learningList.appendChild(
          createSkillCard(skill, "learning")
        )
    );
  }
}

/* EVENTS */

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;

  const button = event.target.closest(
    "[data-action][data-skill-id]"
  );

  if (!button) return;

  const { action, skillId } = button.dataset;

  if (action === "edit") editSkill(skillId);
  if (action === "remove") removeSkill(skillId);
  if (action === "proof") openProofModal(skillId);
});

$("skillForm").addEventListener("submit", saveSkill);
$("proofForm").addEventListener("submit", submitProof);

$("cancelButton").addEventListener(
  "click",
  resetSkillForm
);

$("closeProofButton").addEventListener(
  "click",
  closeProofModal
);

$("cancelProofButton").addEventListener(
  "click",
  closeProofModal
);

$("proofModal").addEventListener("click", (event) => {
  if (event.target === $("proofModal")) {
    closeProofModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    !$("proofModal").hidden
  ) {
    closeProofModal();
  }
});

window.addEventListener("storage", (event) => {
  if (
    event.key === SKILLS_KEY ||
    event.key === PROOFS_KEY
  ) {
    renderAll();
  }
});

/* INITIALIZE */

initializeCatalogue();
updateOutcomeButton();
renderAll();
