
"use strict";

const SKILLS_KEY = "skillbarter_member3_skills";
const PROOFS_KEY = "skillbarter_member3_proofs";

const $ = id => document.getElementById(id);

function readData(key) {
  // TODO: Replace with authenticated Convex queries.
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Could not read stored data:", error);
    return [];
  }
}

function saveData(skills, proofs) {
  // TODO: Use an admin-only Convex mutation that updates both records.
  try {
    localStorage.setItem(SKILLS_KEY, JSON.stringify(skills));
    localStorage.setItem(PROOFS_KEY, JSON.stringify(proofs));
    return true;
  } catch (error) {
    console.error("Could not save review:", error);
    return false;
  }
}

function message(value, isError = false) {
  const element = $("adminMessage");
  element.textContent = value;
  element.className = "message " + (isError ? "error" : "success");
}

function text(parent, tag, value, className = "") {
  const element = document.createElement(tag);
  element.textContent = String(value ?? "");

  if (className) element.className = className;

  parent.appendChild(element);
  return element;
}

function detail(parent, label, value) {
  if (value === undefined || value === null || value === "") return;

  const paragraph = document.createElement("p");
  text(paragraph, "strong", label + ": ");
  paragraph.appendChild(document.createTextNode(String(value)));
  parent.appendChild(paragraph);
}

function getCurrentProof(skill, proofs) {
  return proofs
    .filter(proof => proof.userSkillId === skill.id)
    .sort((a, b) =>
      String(b.createdAt || "").localeCompare(
        String(a.createdAt || "")
      )
    )[0] || null;
}

function getReviewStatus(skill, proof) {
  if (!proof) return "unverified";

  const status = String(proof.status || "").toLowerCase();

  if (status === "verified" || status === "approved") {
    return "verified";
  }

  if (status === "rejected") return "rejected";

  if (
    status === "pending" ||
    status === "submitted" ||
    status === "under_review"
  ) {
    return "pending";
  }

  return "unverified";
}

function createCard(skill, proof, showActions) {
  const status = getReviewStatus(skill, proof);
  const card = document.createElement("article");
  card.className = "request-card " + status;

  text(card, "h3", skill.name || "Unnamed Skill");

  detail(card, "Category", skill.category || "Other");
  detail(card, "Proficiency", skill.proficiency || "Not specified");

  if (skill.learningOutcome?.trim()) {
    const outcomeBox = document.createElement("div");
    outcomeBox.className = "learning-outcome";

    text(outcomeBox, "strong", "Expected Learning Outcome");
    text(outcomeBox, "p", skill.learningOutcome);

    card.appendChild(outcomeBox);
  } else {
    detail(card, "Learning Outcome", "Not provided (older skill entry)");
  }

  text(card, "span", status, "status " + status);

  detail(card, "Proof Type", proof.type || "Not specified");
  detail(card, "Title", proof.title);
  detail(card, "Description", proof.description);

  if (proof.details && typeof proof.details === "object") {
    detail(card, "Issuer", proof.details.issuer);
    detail(card, "Issue Date", proof.details.issueDate);
    detail(card, "Certificate", proof.details.certificateName);
  }

  if (
    typeof proof.externalUrl === "string" &&
    /^https?:\/\//i.test(proof.externalUrl)
  ) {
    const paragraph = document.createElement("p");
    const link = text(paragraph, "a", "View submitted evidence");

    link.href = proof.externalUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    card.appendChild(paragraph);
  }

  if (proof.fileInfo?.name) {
    detail(
      card,
      "Selected File (not uploaded)",
      proof.fileInfo.name
    );
  }

  if (status === "rejected") {
    detail(card, "Rejection Reason", proof.adminComment);
  }

  if (proof.reviewedAt) {
    const reviewedDate = new Date(proof.reviewedAt);

    detail(
      card,
      "Reviewed",
      Number.isNaN(reviewedDate.getTime())
        ? proof.reviewedAt
        : reviewedDate.toLocaleString()
    );
  }

  if (showActions) {
    const actions = document.createElement("div");
    actions.className = "actions";

    const approve = text(
      actions,
      "button",
      "Approve",
      "btn primary"
    );

    approve.type = "button";
    approve.dataset.action = "approve";
    approve.dataset.proofId = proof.id;

    const reject = text(
      actions,
      "button",
      "Reject",
      "btn reject"
    );

    reject.type = "button";
    reject.dataset.action = "reject";
    reject.dataset.proofId = proof.id;

    card.appendChild(actions);
  }

  return card;
}

function renderList(id, entries, emptyLabel, showActions) {
  const container = $(id);
  container.replaceChildren();

  if (!entries.length) {
    text(container, "div", emptyLabel, "empty");
    return;
  }

  for (const entry of entries) {
    container.appendChild(
      createCard(entry.skill, entry.proof, showActions)
    );
  }
}

function renderAdmin() {
  // TODO: Query only requests accessible to an authorized admin.
  const skills = readData(SKILLS_KEY);
  const proofs = readData(PROOFS_KEY);

  const entries = skills
    .filter(skill => skill.type === "teach")
    .map(skill => ({
      skill,
      proof: getCurrentProof(skill, proofs)
    }))
    .filter(entry => entry.proof);

  const pending = entries.filter(entry =>
    getReviewStatus(entry.skill, entry.proof) === "pending" &&
    entry.skill.verificationStatus === "pending"
  );

  const approved = entries.filter(entry =>
    getReviewStatus(entry.skill, entry.proof) === "verified" &&
    entry.skill.verificationStatus === "verified"
  );

  const rejected = entries.filter(entry =>
    getReviewStatus(entry.skill, entry.proof) === "rejected" &&
    entry.skill.verificationStatus === "rejected"
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

  const history = [...approved, ...rejected].sort((a, b) =>
    String(b.proof.reviewedAt || "").localeCompare(
      String(a.proof.reviewedAt || "")
    )
  );

  renderList(
    "historyList",
    history,
    "No reviewed skills yet.",
    false
  );
}

function reviewProof(proofId, action) {
  if (!["approve", "reject"].includes(action)) return;

  const skills = readData(SKILLS_KEY);
  const proofs = readData(PROOFS_KEY);

  const proof = proofs.find(item => item.id === proofId);

  if (!proof || proof.status !== "pending") {
    message("This request is no longer pending.", true);
    renderAdmin();
    return;
  }

  const skill = skills.find(item =>
    item.id === proof.userSkillId &&
    item.type === "teach" &&
    item.verificationStatus === "pending"
  );

  if (!skill || getCurrentProof(skill, proofs)?.id !== proof.id) {
    message("The associated teaching skill is no longer pending.", true);
    renderAdmin();
    return;
  }

  if (
    action === "approve" &&
    (!skill.learningOutcome ||
      skill.learningOutcome.trim().length < 20)
  ) {
    message(
      "Cannot approve this skill. A learning outcome of at least " +
      "20 characters is required. Ask the teacher to update their skill.",
      true
    );
    return;
  }

  if (action === "approve" && !proof.externalUrl) {
    message(
      "Cannot approve this demo proof because no accessible " +
      "evidence URL was submitted.",
      true
    );
    return;
  }

  let reason = "";

  if (action === "reject") {
    const answer = prompt(
      "Enter a reason for rejecting this proof:",
      "Please provide clearer evidence."
    );

    if (answer === null) return;

    reason = answer.trim();

    if (!reason) {
      message("A rejection reason is required.", true);
      return;
    }
  }

  const nextStatus = action === "approve" ? "verified" : "rejected";
  const now = new Date().toISOString();

  const updatedProofs = proofs.map(item =>
    item.id === proof.id
      ? {
          ...item,
          status: nextStatus,
          adminComment: reason,
          reviewedAt: now
        }
      : item
  );

  const updatedSkills = skills.map(item =>
    item.id === skill.id
      ? {
          ...item,
          verificationStatus: nextStatus,
          updatedAt: now
        }
      : item
  );

  // TODO: Enforce admin authorization and review rules in Convex.
  if (!saveData(updatedSkills, updatedProofs)) {
    message("Unable to save the review. Please try again.", true);
    return;
  }

  renderAdmin();

  message(
    nextStatus === "verified"
      ? skill.name + " approved successfully."
      : skill.name + " rejected successfully."
  );
}

document.addEventListener("click", event => {
  const button = event.target.closest("[data-action][data-proof-id]");
  if (!button) return;

  reviewProof(button.dataset.proofId, button.dataset.action);
});

$("refreshButton").addEventListener("click", () => {
  renderAdmin();
  message("Review list refreshed.");
});

window.addEventListener("storage", event => {
  if (event.key === SKILLS_KEY || event.key === PROOFS_KEY) {
    renderAdmin();
  }
});

renderAdmin();
