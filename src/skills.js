
"use strict";

const SKILLS_KEY = "skillbarter_member3_skills";
const PROOFS_KEY = "skillbarter_member3_proofs";

const CATALOGUE = {
  Programming: [
    "Python", "JavaScript", "Java", "C++", "C", "HTML & CSS",
    "React", "Web Development", "Data Structures", "Machine Learning"
  ],
  Design: [
    "UI/UX Design", "Graphic Design", "Figma", "Canva",
    "Adobe Photoshop", "3D Modeling"
  ],
  Languages: [
    "English", "Hindi", "French", "Spanish", "German", "Japanese"
  ],
  Business: [
    "Digital Marketing", "Public Speaking", "Entrepreneurship",
    "Leadership", "Finance", "Communication"
  ],
  Creative: [
    "Photography", "Video Editing", "Content Writing",
    "Music", "Drawing", "Animation"
  ],
  Other: []
};

const FIELD_SETS = {
  certificate: [
    { id: "certificateName", label: "Certificate Name", type: "text", required: true },
    { id: "issuer", label: "Issuing Organization", type: "text", required: true },
    { id: "issueDate", label: "Issue Date", type: "date", required: true },
    { id: "proofUrl", label: "Certificate Verification URL", type: "url" },
    { id: "proofFile", label: "Certificate PDF or Image", type: "file" }
  ],
  github: [
    { id: "proofTitle", label: "Project Name", type: "text", required: true },
    { id: "proofUrl", label: "GitHub Repository URL", type: "url", required: true },
    { id: "proofDescription", label: "Project Description", type: "textarea", required: true }
  ],
  project: [
    { id: "proofTitle", label: "Project Title", type: "text", required: true },
    { id: "proofDescription", label: "What Did You Build?", type: "textarea", required: true },
    { id: "proofUrl", label: "Live Demo / Project URL", type: "url" },
    { id: "proofFile", label: "Project Evidence File", type: "file" }
  ],
  portfolio: [
    { id: "proofTitle", label: "Portfolio Title", type: "text", required: true },
    { id: "proofUrl", label: "Portfolio URL", type: "url", required: true },
    { id: "proofDescription", label: "Describe Your Work", type: "textarea" }
  ],
  achievement: [
    { id: "proofTitle", label: "Achievement Title", type: "text", required: true },
    { id: "issuer", label: "Issuing Organization", type: "text", required: true },
    { id: "issueDate", label: "Achievement Date", type: "date", required: true },
    { id: "proofUrl", label: "Evidence URL", type: "url" },
    { id: "proofFile", label: "Evidence PDF or Image", type: "file" }
  ]
};

const $ = id => document.getElementById(id);

function read(key) {
  // BACKEND INTEGRATION: Replace localStorage reads with authenticated Convex queries.
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Could not read data:", error);
    return [];
  }
}

let skills = read(SKILLS_KEY);
let proofs = read(PROOFS_KEY);
let editingId = null;
let draft = null;
let returnFocus = null;

function save() {
  // BACKEND INTEGRATION: Replace localStorage writes with Convex mutations for the signed-in user.
  try {
    localStorage.setItem(SKILLS_KEY, JSON.stringify(skills));
    localStorage.setItem(PROOFS_KEY, JSON.stringify(proofs));
    return true;
  } catch (error) {
    console.error(error);
    alert("Unable to save. Check browser storage permissions or available space.");
    return false;
  }
}

function uid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : "item_" + Date.now() + "_" + Math.random().toString(36).slice(2);
}

function clean(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function norm(value) {
  return clean(value).toLowerCase();
}

function message(id, value, isError = false) {
  const element = $(id);
  element.textContent = value;
  element.className = "message " + (isError ? "error" : "success");
}

function selectedType() {
  return document.querySelector('input[name="skillType"]:checked')?.value || "";
}

function text(parent, tag, value, className = "") {
  const node = document.createElement(tag);
  node.textContent = value;
  if (className) node.className = className;
  parent.appendChild(node);
  return node;
}

function button(parent, label, handler, extra = "") {
  const node = text(parent, "button", label, "small-btn " + extra);
  node.type = "button";
  node.addEventListener("click", handler);
  return node;
}

function latestProof(skillId) {
  return proofs
    .filter(proof => proof.userSkillId === skillId)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
}

function setupCatalogue() {
  for (const category of Object.keys(CATALOGUE)) {
    $("category").add(new Option(category, category));
  }
}

function updateOptions() {
  const category = $("category").value;
  const select = $("skillName");

  select.replaceChildren(
    new Option(category ? "Choose a skill" : "Choose category first", "")
  );

  select.disabled = !category;

  for (const name of CATALOGUE[category] || []) {
    select.add(new Option(name, name));
  }

  if (category) {
    select.add(new Option("Add Custom Skill", "__custom__"));
  }

  if (category === "Other") {
    select.value = "__custom__";
  }

  updateCustom();
}

function updateCustom() {
  const isCustom = $("skillName").value === "__custom__";
  $("customSkillBox").hidden = !isCustom;
  $("customSkill").required = isCustom;

  if (!isCustom) {
    $("customSkill").value = "";
  }
}

function formSkill() {
  const category = $("category").value;
  const isCustom = $("skillName").value === "__custom__";
  const name = clean(isCustom ? $("customSkill").value : $("skillName").value);
  const type = selectedType();
  const proficiency = $("proficiency").value;

  if (!CATALOGUE.hasOwnProperty(category) ||
      !name ||
      !["teach", "learn"].includes(type) ||
      !["beginner", "intermediate", "advanced"].includes(proficiency)) {
    message("formMessage", "Complete every required field.", true);
    return null;
  }

  if (name.length > 60) {
    message("formMessage", "Skill name must be at most 60 characters.", true);
    return null;
  }

  if (skills.some(skill =>
    skill.id !== editingId &&
    norm(skill.name) === norm(name) &&
    skill.type === type
  )) {
    message("formMessage", "You already added this skill for " + type + ".", true);
    return null;
  }

  const old = skills.find(skill => skill.id === editingId);
  const now = new Date().toISOString();

  const unchangedTeaching = old?.type === "teach" &&
    type === "teach" &&
    old.name === name &&
    old.category === category &&
    old.proficiency === proficiency;

  return {
    id: old?.id || uid(),
    name,
    normalizedName: norm(name),
    category,
    type,
    proficiency,
    isCustom,
    verificationStatus: type === "teach"
      ? (unchangedTeaching ? old.verificationStatus : "unverified")
      : null,
    createdAt: old?.createdAt || now,
    updatedAt: now
  };
}

function resetSkillForm() {
  $("skillForm").reset();
  editingId = null;
  $("formTitle").textContent = "Equip a New Skill";
  $("saveButton").textContent = "CONTINUE";
  $("cancelButton").hidden = true;
  updateOptions();
}

function storeSkill(skill, removeProofs = false) {
  const previousSkills = skills;
  const previousProofs = proofs;

  skills = [...skills.filter(item => item.id !== skill.id), skill];

  if (removeProofs) {
    proofs = proofs.filter(proof => proof.userSkillId !== skill.id);
  }

  if (!save()) {
    skills = previousSkills;
    proofs = previousProofs;
    return false;
  }

  return true;
}

function handleSkillSubmit(event) {
  event.preventDefault();

  const skill = formSkill();
  if (!skill) return;

  const old = skills.find(item => item.id === skill.id);

  if (skill.type === "teach") {
    const unchanged = old?.type === "teach" &&
      old.name === skill.name &&
      old.category === skill.category &&
      old.proficiency === skill.proficiency;

    if (unchanged) {
      if (!storeSkill(skill)) return;
      resetSkillForm();
      render();
      message("formMessage", "Skill details saved.");
      return;
    }

    openProof(skill);
    return;
  }

  if (!storeSkill(skill, true)) return;

  resetSkillForm();
  render();
  message("formMessage", "Learning skill saved to inventory.");
}

function editSkill(id) {
  const skill = skills.find(item => item.id === id);
  if (!skill) return;

  editingId = id;
  $("category").value = skill.category;
  updateOptions();

  const predefined = CATALOGUE[skill.category] || [];
  const custom = skill.isCustom || !predefined.includes(skill.name);

  $("skillName").value = custom ? "__custom__" : skill.name;
  updateCustom();

  if (custom) $("customSkill").value = skill.name;

  const radio = document.querySelector(
    'input[name="skillType"][value="' + skill.type + '"]'
  );
  if (radio) radio.checked = true;

  $("proficiency").value = skill.proficiency;
  $("formTitle").textContent = "Edit Your Skill";
  $("saveButton").textContent = "SAVE / CONTINUE";
  $("cancelButton").hidden = false;

  message(
    "formMessage",
    skill.type === "teach"
      ? "Changing teaching details requires fresh proof."
      : "Editing " + skill.name
  );

  $("skillEditor").scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteSkill(id) {
  const skill = skills.find(item => item.id === id);
  if (!skill || !confirm('Delete "' + skill.name + '"?')) return;

  const previousSkills = skills;
  const previousProofs = proofs;

  skills = skills.filter(item => item.id !== id);
  proofs = proofs.filter(proof => proof.userSkillId !== id);

  if (!save()) {
    skills = previousSkills;
    proofs = previousProofs;
    return;
  }

  if (editingId === id) resetSkillForm();

  render();
  message("formMessage", "Skill deleted.");
}

function todayLocal() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 10);
}

function renderProofFields() {
  const type = $("proofType").value;
  const container = $("dynamicProofFields");
  container.replaceChildren();
  message("proofMessage", "");

  const hints = {
    certificate: "Provide a public certificate verification URL.",
    github: "A public GitHub repository URL is required.",
    project: "Provide a public project or evidence URL.",
    portfolio: "A public portfolio URL is required.",
    achievement: "Provide a public achievement evidence URL."
  };

  $("proofHint").textContent =
    hints[type] || "Choose a proof type to see the relevant fields.";

  for (const field of FIELD_SETS[type] || []) {
    const wrapper = document.createElement("div");
    wrapper.className = "field";

    const label = text(
      wrapper,
      "label",
      field.label + (field.required ? " *" : "")
    );
    label.htmlFor = field.id;

    const input = document.createElement(
      field.type === "textarea" ? "textarea" : "input"
    );

    if (field.type === "textarea") {
      input.rows = 3;
      input.maxLength = 500;
    } else {
      input.type = field.type;
    }

    input.id = field.id;
    input.name = field.id;
    input.required = Boolean(field.required);

    if (field.type === "text") input.maxLength = 100;
    if (field.type === "file") input.accept = ".pdf,.png,.jpg,.jpeg,.webp";
    if (field.type === "date") input.max = todayLocal();

    wrapper.appendChild(input);
    container.appendChild(wrapper);
  }
}

function openProof(skill) {
  draft = { ...skill };
  returnFocus = document.activeElement;

  $("proofForm").reset();
  renderProofFields();

  $("proofSkillLabel").textContent =
    skill.name + " - " + skill.proficiency;

  $("proofModal").hidden = false;
  document.body.classList.add("modal-open");
  $("proofType").focus();
}

function closeProof() {
  $("proofModal").hidden = true;
  document.body.classList.remove("modal-open");
  draft = null;

  if (returnFocus?.isConnected) returnFocus.focus();
  returnFocus = null;
}

function validUrl(value, githubOnly = false) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) &&
      (!githubOnly || url.hostname.toLowerCase() === "github.com" ||
       url.hostname.toLowerCase() === "www.github.com");
  } catch {
    return false;
  }
}

function submitProof(event) {
  event.preventDefault();
  if (!draft) return;

  const type = $("proofType").value;
  const fields = FIELD_SETS[type];

  if (!fields) {
    message("proofMessage", "Choose a proof type.", true);
    return;
  }

  const details = {};
  let fileInfo = null;

  for (const field of fields) {
    const input = $(field.id);

    if (field.type === "file") {
      const file = input.files[0];

      if (file) {
        const validExtension = /\.(pdf|png|jpe?g|webp)$/i.test(file.name);
        const validSize = file.size <= 5 * 1024 * 1024;

        if (!validExtension || !validSize) {
          message("proofMessage", "Choose a PDF/image file up to 5 MB.", true);
          return;
        }

        // BACKEND INTEGRATION: Upload the actual file to Convex storage and save its storage ID.
        fileInfo = {
          name: file.name,
          size: file.size,
          mimeType: file.type
        };
      }
    } else {
      const value = input.value.trim();

      if (field.required && !value) {
        message("proofMessage", field.label + " is required.", true);
        return;
      }

      if (field.type === "url" && value &&
          !validUrl(value, type === "github")) {
        message("proofMessage", "Enter a valid public URL.", true);
        return;
      }

      if (field.type === "date" && value > todayLocal()) {
        message("proofMessage", "The date cannot be in the future.", true);
        return;
      }

      details[field.id] = value;
    }
  }

  const externalUrl = details.proofUrl || "";

  if (["certificate", "project", "achievement"].includes(type) &&
      !externalUrl) {
    message(
      "proofMessage",
      "A public evidence URL is required in demo mode.",
      true
    );
    return;
  }

  const now = new Date().toISOString();

  const proof = {
    id: uid(),
    userSkillId: draft.id,
    type,
    title: details.proofTitle || details.certificateName || "",
    description: details.proofDescription || "",
    externalUrl,
    fileInfo,
    details,
    status: "pending",
    adminComment: "",
    reviewedAt: null,
    createdAt: now
  };

  const skill = {
    ...draft,
    verificationStatus: "pending",
    updatedAt: now
  };

  const previousSkills = skills;
  const previousProofs = proofs;

  skills = [...skills.filter(item => item.id !== skill.id), skill];
  proofs = [
    ...proofs.filter(item => item.userSkillId !== skill.id),
    proof
  ];

  // BACKEND INTEGRATION: Submit the proof and update the user skill through Convex mutations.
  if (!save()) {
    skills = previousSkills;
    proofs = previousProofs;
    return;
  }

  closeProof();
  resetSkillForm();
  render();

  message(
    "formMessage",
    "Proof submitted. Your teaching skill is pending review."
  );
}

function card(skill, queue = false) {
  const status = skill.verificationStatus || "unverified";
  const box = document.createElement("article");
  box.className = "card " + (skill.type === "learn" ? "learn" : status);

  text(box, "h4", skill.name);
  text(box, "p", skill.category);

  const tags = document.createElement("div");
  tags.className = "tags";

  text(tags, "span", skill.proficiency, "tag");

  if (skill.type === "teach") {
    const labels = {
      verified: "Verified",
      pending: "Pending Review",
      rejected: "Rejected",
      unverified: "Unverified"
    };
    text(tags, "span", labels[status] || "Unverified", "tag " + status);
  } else {
    text(tags, "span", "Learning", "tag");
  }

  box.appendChild(tags);

  const proof = latestProof(skill.id);

  if (queue && status === "rejected") {
    text(
      box,
      "p",
      "Reason: " + (proof?.adminComment || "Please resubmit evidence.")
    );
  }

  if (queue && status === "pending") {
    text(box, "p", "Proof submitted; awaiting admin review.");
  }

  const actions = document.createElement("div");
  actions.className = "actions";

  if (queue && ["unverified", "rejected"].includes(status)) {
    button(actions, "Submit Proof", () => openProof(skill));
  }

  button(actions, "Edit", () => editSkill(skill.id));
  button(actions, "Delete", () => deleteSkill(skill.id), "danger");

  box.appendChild(actions);
  return box;
}

function fillList(id, items, emptyLabel, queue = false) {
  const root = $(id);
  root.replaceChildren();

  if (!items.length) {
    text(root, "div", emptyLabel, "empty");
    return;
  }

  items.forEach(skill => root.appendChild(card(skill, queue)));
}

function render() {
  const teaching = skills.filter(skill =>
    skill.type === "teach" &&
    skill.verificationStatus === "verified"
  );

  const learning = skills.filter(skill => skill.type === "learn");

  const queue = skills.filter(skill =>
    skill.type === "teach" &&
    skill.verificationStatus !== "verified"
  );

  $("teachCount").textContent = teaching.length;
  $("learnCount").textContent = learning.length;
  $("pendingCount").textContent = queue.filter(skill =>
    skill.verificationStatus === "pending"
  ).length;

  fillList(
    "teachingList",
    teaching,
    "No verified teaching skills yet."
  );

  fillList(
    "learningList",
    learning,
    "No learning skills yet."
  );

  fillList(
    "verificationList",
    queue,
    "No skills awaiting verification.",
    true
  );
}

$("category").addEventListener("change", updateOptions);
$("skillName").addEventListener("change", updateCustom);
$("skillForm").addEventListener("submit", handleSkillSubmit);

$("cancelButton").addEventListener("click", () => {
  resetSkillForm();
  message("formMessage", "");
});

$("proofType").addEventListener("change", renderProofFields);
$("proofForm").addEventListener("submit", submitProof);
$("closeProofButton").addEventListener("click", closeProof);
$("cancelProofButton").addEventListener("click", closeProof);

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !$("proofModal").hidden) {
    closeProof();
  }
});

window.addEventListener("storage", event => {
  if (event.key === SKILLS_KEY || event.key === PROOFS_KEY) {
    skills = read(SKILLS_KEY);
    proofs = read(PROOFS_KEY);
    render();
  }
});

setupCatalogue();
updateOptions();
render();
