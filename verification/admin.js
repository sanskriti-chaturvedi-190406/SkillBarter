
"use strict";

/*
 * SkillBarter Admin Verification
 *
 * DEMO DATA ADAPTER
 * -----------------
 * Uses localStorage until the real Convex backend is connected.
 *
 * This is NOT secure admin authorization.
 * Approval/rejection must eventually be performed by
 * authenticated, admin-only Convex mutations.
 */

const SKILLS_KEY = "skillbarter_member3_skills";
const PROOFS_KEY = "skillbarter_member3_proofs";

const PENDING_STATUSES = ["submitted", "under_review"];
const REVIEWED_STATUSES = ["verified", "rejected"];

const $ = (id) => document.getElementById(id);

/* ---------------------------------
   STORAGE HELPERS
--------------------------------- */

function readData(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = JSON.parse(raw || "[]");

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to read data:", error);
    return [];
  }
}

function saveData(skills, proofs) {
  try {
    // Demo only: these two writes are not atomic.
    localStorage.setItem(
      SKILLS_KEY,
      JSON.stringify(skills)
    );

    localStorage.setItem(
      PROOFS_KEY,
      JSON.stringify(proofs)
    );

    return true;
  } catch (error) {
    console.error("Failed to save review:", error);
    return false;
  }
}

/* ---------------------------------
   SCHEMA COMPATIBILITY
--------------------------------- */

function getId(record) {
  return String(record?._id ?? record?.id ?? "");
}

function normalizeStatus(status) {
  const value = String(status ?? "")
    .trim()
    .toLowerCase();

  // Compatibility with old localStorage records.
  // New records should never use these values.
  if (value === "pending") return "submitted";
  if (value === "approved") return "verified";

  const valid = [
    "unverified",
    "submitted",
    "under_review",
    "verified",
    "rejected"
  ];

  return valid.includes(value)
    ? value
    : "unverified";
}

function getTimestamp(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const numeric = Number(value);

    if (value.trim() && Number.isFinite(numeric)) {
      return numeric;
    }

    const parsed = Date.parse(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatDate(value) {
  const timestamp = getTimestamp(value);

  if (!timestamp) return "Not available";

  return new Date(timestamp).toLocaleString();
}

function getLearningOutcomes(skill) {
  if (Array.isArray(skill.learningOutcomes)) {
    return skill.learningOutcomes
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  // Read-only compatibility with older demo data.
  if (
    typeof skill.learningOutcome === "string" &&
    skill.learningOutcome.trim()
  ) {
    return [skill.learningOutcome.trim()];
  }

  return [];
}

/* ---------------------------------
   UI HELPERS
--------------------------------- */

function showMessage(value, isError = false) {
  const element = $("adminMessage");

  if (!element) return;

  element.textContent = value;

  element.className = isError
    ? "message error"
    : "message success";
}

function addText(parent, tag, value, className = "") {
  const element = document.createElement(tag);

  element.textContent = String(value ?? "");

  if (className) {
    element.className = className;
  }

  parent.appendChild(element);

  return element;
}

function addDetail(parent, label, value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return;
  }

  const paragraph = document.createElement("p");

  addText(paragraph, "strong", label + ": ");

  paragraph.appendChild(
    document.createTextNode(String(value))
  );

  parent.appendChild(paragraph);
}

function addLearningOutcomes(card, skill) {
  const outcomes = getLearningOutcomes(skill);

  const container = document.createElement("div");
  container.className = "learning-outcome";

  addText(
    container,
    "strong",
    "Expected Learning Outcomes"
  );

  if (!outcomes.length) {
    addText(
      container,
      "p",
      "No learning outcomes provided."
    );
  } else {
    const list = document.createElement("ul");

    outcomes.forEach((outcome) => {
      addText(list, "li", outcome);
    });

    container.appendChild(list);
  }

  card.appendChild(container);
}

/* ---------------------------------
   PROOF AND SKILL RELATIONSHIP
--------------------------------- */

function getSkillForProof(proof, skills) {
  return skills.find((skill) => {
    return (
      getId(skill) === String(proof.userSkillId) &&
      skill.type === "teach"
    );
  }) || null;
}

function getSkillName(skill) {
  // A joined Convex query can return a skillName.
  // Old demo records may contain name directly.
  return (
    skill.skillName ||
    skill.name ||
    "Unnamed Skill"
  );
}

function getProofEntries() {
  const skills = readData(SKILLS_KEY);
  const proofs = readData(PROOFS_KEY);

  return proofs
    .map((proof) => ({
      proof,
      skill: getSkillForProof(proof, skills)
    }))
    .filter((entry) => entry.skill !== null);
}

/* ---------------------------------
   REQUEST CARD
--------------------------------- */

function createCard(entry, showActions = false) {
  const { skill, proof } = entry;

  const status = normalizeStatus(proof.status);

  const card = document.createElement("article");

  card.className = "request-card " + status;

  addText(
    card,
    "h3",
    getSkillName(skill)
  );

  addDetail(
    card,
    "Category",
    skill.category || "Other"
  );

  addDetail(
    card,
    "Proficiency",
    skill.proficiency || "Not specified"
  );

  addLearningOutcomes(card, skill);

  const statusLabel = status.replaceAll("_", " ");

  addText(
    card,
    "span",
    statusLabel,
    "status " + status
  );

  addDetail(
    card,
    "Proof Type",
    proof.type || "Not specified"
  );

  addDetail(
    card,
    "Title",
    proof.title
  );

  addDetail(
    card,
    "Description",
    proof.description
  );

  addDetail(
    card,
    "Submitted",
    formatDate(proof.createdAt)
  );

  if (proof.details && typeof proof.details === "object") {
    addDetail(
      card,
      "Issuer",
      proof.details.issuer
    );

    addDetail(
      card,
      "Issue Date",
      proof.details.issueDate
    );

    addDetail(
      card,
      "Certificate",
      proof.details.certificateName
    );
  }

  if (
    typeof proof.externalUrl === "string" &&
    /^https?:\/\//i.test(proof.externalUrl)
  ) {
    const paragraph = document.createElement("p");

    const link = addText(
      paragraph,
      "a",
      "View submitted evidence"
    );

    link.href = proof.externalUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    card.appendChild(paragraph);
  }

  // Demo file metadata is not an uploaded Convex file.
  if (proof.fileInfo?.name) {
    addDetail(
      card,
      "Selected File (not uploaded)",
      proof.fileInfo.name
    );
  }

  if (status === "rejected") {
    addDetail(
      card,
      "Rejection Reason",
      proof.adminComment
    );
  }

  if (proof.reviewedAt) {
    addDetail(
      card,
      "Reviewed",
      formatDate(proof.reviewedAt)
    );
  }

  if (showActions) {
    const actions = document.createElement("div");
    actions.className = "actions";

    const approveButton = addText(
      actions,
      "button",
      "Approve",
      "btn primary"
    );

    approveButton.type = "button";
    approveButton.dataset.action = "approve";
    approveButton.dataset.proofId = getId(proof);

    const rejectButton = addText(
      actions,
      "button",
      "Reject",
      "btn reject"
    );

    rejectButton.type = "button";
    rejectButton.dataset.action = "reject";
    rejectButton.dataset.proofId = getId(proof);

    card.appendChild(actions);
  }

  return card;
}

/* ---------------------------------
   RENDER LIST
--------------------------------- */

function renderList(
  containerId,
  entries,
  emptyMessage,
  showActions = false
) {
  const container = $(containerId);

  if (!container) return;

  container.replaceChildren();

  if (!entries.length) {
    addText(
      container,
      "div",
      emptyMessage,
      "empty"
    );

    return;
  }

  entries.forEach((entry) => {
    container.appendChild(
      createCard(entry, showActions)
    );
  });
}

/* ---------------------------------
   ADMIN DASHBOARD
--------------------------------- */

function renderAdmin() {
  const entries = getProofEntries();

  const pending = entries.filter(({ proof }) =>
    PENDING_STATUSES.includes(
      normalizeStatus(proof.status)
    )
  );

  const approved = entries.filter(({ proof }) =>
    normalizeStatus(proof.status) === "verified"
  );

  const rejected = entries.filter(({ proof }) =>
    normalizeStatus(proof.status) === "rejected"
  );

  pending.sort(
    (a, b) =>
      getTimestamp(b.proof.createdAt) -
      getTimestamp(a.proof.createdAt)
  );

  const history = entries
    .filter(({ proof }) =>
      REVIEWED_STATUSES.includes(
        normalizeStatus(proof.status)
      )
    )
    .sort(
      (a, b) =>
        getTimestamp(b.proof.reviewedAt) -
        getTimestamp(a.proof.reviewedAt)
    );

  $("pendingCount").textContent = pending.length;
  $("approvedCount").textContent = approved.length;
  $("rejectedCount").textContent = rejected.length;

  renderList(
    "pendingList",
    pending,
    "No pending verification requests.",
    true
  );

  renderList(
    "historyList",
    history,
    "No reviewed proofs yet.",
    false
  );
}

/* ---------------------------------
   REVIEW PROOF
--------------------------------- */

function reviewProof(proofId, action) {
  if (!["approve", "reject"].includes(action)) {
    return;
  }

  const skills = readData(SKILLS_KEY);
  const proofs = readData(PROOFS_KEY);

  const proof = proofs.find(
    (item) => getId(item) === String(proofId)
  );

  if (!proof) {
    showMessage("Proof not found.", true);
    renderAdmin();
    return;
  }

  const currentStatus = normalizeStatus(proof.status);

  if (!PENDING_STATUSES.includes(currentStatus)) {
    showMessage(
      "This proof has already been reviewed.",
      true
    );

    renderAdmin();
    return;
  }

  const skill = getSkillForProof(proof, skills);

  if (!skill) {
    showMessage(
      "Associated teaching skill not found.",
      true
    );

    return;
  }

  /*
   * Schema allows learningOutcomes: [].
   * Do not require a minimum character count here.
   *
   * If the team adopts a maximum of two outcomes,
   * enforce it in the skills form AND backend mutation.
   */

  const outcomes = getLearningOutcomes(skill);

  if (outcomes.length > 2) {
    showMessage(
      "This skill has more than two learning outcomes. " +
      "Please correct the skill before reviewing.",
      true
    );

    return;
  }

  /*
   * Demo limitation:
   * A local file name is not proof of an uploaded file.
   * Real backend review should validate a storage fileId
   * or an accepted externalUrl.
   */
  if (
    action === "approve" &&
    !proof.externalUrl &&
    !proof.fileId
  ) {
    showMessage(
      "Cannot approve: no accessible evidence URL " +
      "or uploaded file ID is available.",
      true
    );

    return;
  }

  let rejectionReason = "";

  if (action === "reject") {
    const answer = window.prompt(
      "Enter the reason for rejection:",
      "Please provide clearer evidence."
    );

    if (answer === null) {
      return;
    }

    rejectionReason = answer.trim();

    if (!rejectionReason) {
      showMessage(
        "A rejection reason is required.",
        true
      );

      return;
    }
  }

  const nextStatus =
    action === "approve" ? "verified" : "rejected";

  const now = Date.now();

  const updatedProofs = proofs.map((item) => {
    if (getId(item) !== getId(proof)) {
      return item;
    }

    return {
      ...item,
      status: nextStatus,
      adminComment: rejectionReason,
      reviewedAt: now

      // reviewedBy must be assigned by the backend
      // from the authenticated admin identity.
    };
  });

  /*
   * A user skill may have multiple proofs.
   * Update its verificationStatus according to
   * the latest relevant proof, rather than blindly
   * overwriting the status of every submission.
   */
  const updatedSkills = skills.map((item) => {
    if (getId(item) !== getId(skill)) {
      return item;
    }

    const relatedProofs = updatedProofs
      .filter(
        (candidate) =>
          String(candidate.userSkillId) === getId(item)
      )
      .sort(
        (a, b) =>
          getTimestamp(b.createdAt) -
          getTimestamp(a.createdAt)
      );

    const latestProof = relatedProofs[0];

    return {
      ...item,
      verificationStatus: latestProof
        ? normalizeStatus(latestProof.status)
        : "unverified",
      updatedAt: now
    };
  });

  /*
   * DEMO ONLY:
   * Replace with one authorized Convex mutation.
   * The backend must update the proof and userSkill
   * atomically, and verify admin permissions.
   */
  const saved = saveData(
    updatedSkills,
    updatedProofs
  );

  if (!saved) {
    showMessage(
      "Unable to save review. Please try again.",
      true
    );

    return;
  }

  renderAdmin();

  showMessage(
    nextStatus === "verified"
      ? getSkillName(skill) + " approved successfully."
      : getSkillName(skill) + " rejected successfully."
  );
}

/* ---------------------------------
   EVENT LISTENERS
--------------------------------- */

document.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof Element)) {
    return;
  }

  const button = target.closest(
    "[data-action][data-proof-id]"
  );

  if (!button) {
    return;
  }

  reviewProof(
    button.dataset.proofId,
    button.dataset.action
  );
});

$("refreshButton")?.addEventListener(
  "click",
  () => {
    renderAdmin();
    showMessage("Review list refreshed.");
  }
);

window.addEventListener("storage", (event) => {
  if (
    event.key === SKILLS_KEY ||
    event.key === PROOFS_KEY
  ) {
    renderAdmin();
  }
});

/* ---------------------------------
   INITIALIZE
--------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  renderAdmin();
});
