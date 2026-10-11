
"use strict";
const SKILLS_KEY = "skillbarter_member3_skills";
const PROOFS_KEY = "skillbarter_member3_proofs";
const CATALOGUE = {
  Programming: [
    "Python",
    "JavaScript",
    "Java",
    "C++",
    "C",
    "HTML & CSS",
    "React",
    "Web Development",
    "Data Structures",
    "Machine Learning"
  ],

  Design: [
    "UI/UX Design",
    "Graphic Design",
    "Figma",
    "Canva",
    "Adobe Photoshop",
    "3D Modeling"
  ],

  Languages: [
    "English",
    "Hindi",
    "French",
    "Spanish",
    "German",
    "Japanese"
  ],

  Business: [
    "Digital Marketing",
    "Public Speaking",
    "Entrepreneurship",
    "Leadership",
    "Finance",
    "Communication"
  ],

  Creative: [
    "Photography",
    "Video Editing",
    "Content Writing",
    "Music",
    "Drawing",
    "Animation"
  ],

  Other: []
};

const FIELD_SETS = {
  certificate: [
    {
      id: "certificateName",
      label: "Certificate Name",
      type: "text",
      required: true
    },
    {
      id: "issuer",
      label: "Issuing Organization",
      type: "text",
      required: true
    },
    {
      id: "issueDate",
      label: "Issue Date",
      type: "date",
      required: true
    },
    {
      id: "proofUrl",
      label: "Certificate Verification URL",
      type: "url"
    },
    {
      id: "proofFile",
      label: "Certificate PDF or Image",
      type: "file"
    }
  ],

  github: [
    {
      id: "proofTitle",
      label: "Project Name",
      type: "text",
      required: true
    },
    {
      id: "proofUrl",
      label: "GitHub Repository URL",
      type: "url",
      required: true
    },
    {
      id: "proofDescription",
      label: "Project Description",
      type: "textarea",
      required: true
    }
  ],

  project: [
    {
      id: "proofTitle",
      label: "Project Title",
      type: "text",
      required: true
    },
    {
      id: "proofDescription",
      label: "What Did You Build?",
      type: "textarea",
      required: true
    },
    {
      id: "proofUrl",
      label: "Live Demo / Project URL",
      type: "url"
    },
    {
      id: "proofFile",
      label: "Project Evidence File",
      type: "file"
    }
  ],

  portfolio: [
    {
      id: "proofTitle",
      label: "Portfolio Title",
      type: "text",
      required: true
    },
    {
      id: "proofUrl",
      label: "Portfolio URL",
      type: "url",
      required: true
    },
    {
      id: "proofDescription",
      label: "Describe Your Work",
      type: "textarea"
    }
  ],

  achievement: [
    {
      id: "proofTitle",
      label: "Achievement Title",
      type: "text",
      required: true
    },
    {
      id: "issuer",
      label: "Issuing Organization",
      type: "text",
      required: true
    },
    {
      id: "issueDate",
      label: "Achievement Date",
      type: "date",
      required: true
    },
    {
      id: "proofUrl",
      label: "Evidence URL",
      type: "url"
    },
    {
      id: "proofFile",
      label: "Evidence PDF or Image",
      type: "file"
    }
  ]
};

/* =========================================
   DOM HELPERS
========================================= */

const $ = id => document.getElementById(id);

function clean(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function norm(value) {
  return clean(value).toLowerCase();
}

function uid() {
  return (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  )
    ? crypto.randomUUID()
    : "item_" +
        Date.now() +
        "_" +
        Math.random().toString(36).slice(2);
}

function message(id, value, isError = false) {
  const element = $(id);

  if (!element) return;

  element.textContent = value;

  element.className =
    "message " + (isError ? "error" : "success");
}

function text(parent, tag, value, className = "") {
  const element = document.createElement(tag);

  element.textContent = String(value ?? "");

  if (className) {
    element.className = className;
  }

  parent.appendChild(element);

  return element;
}

function button(parent, label, handler, extra = "") {
  const element = text(
    parent,
    "button",
    label,
    "small-btn " + extra
  );

  element.type = "button";
  element.addEventListener("click", handler);

  return element;
}

/* =========================================
   LOCAL STORAGE
========================================= */

function read(key) {
  // TODO: Replace with authenticated Convex queries.

  try {
    const value = JSON.parse(
      localStorage.getItem(key) || "[]"
    );

    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.error("Unable to read data:", error);
    return [];
  }
}

let skills = read(SKILLS_KEY);
let proofs = read(PROOFS_KEY);

let editingId = null;
let draft = null;
let returnFocus = null;

function save() {
  // TODO: Replace with Convex mutations.

  try {
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
    console.error("Unable to save data:", error);
    alert("Unable to save. Check browser storage.");
    return false;
  }
}

/* =========================================
   SKILL TYPE
========================================= */

function selectedType() {
  return document.querySelector(
    'input[name="skillType"]:checked'
  )?.value || "";
}

/* =========================================
   MULTIPLE LEARNING OUTCOMES
========================================= */

/**
 * New format:
 * learningOutcomes: ["Outcome 1", "Outcome 2"]
 *
 * Old format:
 * learningOutcome: "Outcome 1"
 *
 * This helper supports both formats.
 */
function getStoredOutcomes(skill) {
  if (Array.isArray(skill?.learningOutcomes)) {
    return skill.learningOutcomes
      .filter(value => typeof value === "string")
      .map(value => value.trim())
      .filter(Boolean);
  }

  if (
    typeof skill?.learningOutcome === "string" &&
    skill.learningOutcome.trim()
  ) {
    return [skill.learningOutcome.trim()];
  }

  return [];
}

function addOutcome(value = "") {
  const container = $("outcomesContainer");

  if (!container) return;

  const row = document.createElement("div");
  row.className = "outcome-row";

  const input = document.createElement("input");

  input.type = "text";
  input.className = "outcome-input";
  input.placeholder =
    "e.g. Learners can write basic Python programs";
  input.maxLength = 200;
  input.value = value;

  input.setAttribute(
    "aria-label",
    "Expected learning outcome"
  );

  const removeButton = document.createElement("button");

  removeButton.type = "button";
  removeButton.className = "outcome-remove";
  removeButton.textContent = "Remove";

  removeButton.addEventListener("click", () => {
    row.remove();

    if (
      selectedType() === "teach" &&
      container.children.length === 0
    ) {
      addOutcome();
    }
  });

  row.appendChild(input);
  row.appendChild(removeButton);

  container.appendChild(row);
}

function getLearningOutcomes() {
  return [
    ...document.querySelectorAll(".outcome-input")
  ]
    .map(input => clean(input.value))
    .filter(Boolean);
}

function updateLearningOutcome() {
  const isTeaching = selectedType() === "teach";

  $("learningOutcomeBox").hidden = !isTeaching;

  if (
    isTeaching &&
    $("outcomesContainer").children.length === 0
  ) {
    addOutcome();
  }
}

function clearOutcomeInputs() {
  $("outcomesContainer").replaceChildren();
}

function setOutcomeInputs(outcomes = []) {
  clearOutcomeInputs();

  outcomes.forEach(outcome => {
    addOutcome(outcome);
  });

  if (
    selectedType() === "teach" &&
    $("outcomesContainer").children.length === 0
  ) {
    addOutcome();
  }
}

function sameOutcomes(first, second) {
  return (
    JSON.stringify(first) ===
    JSON.stringify(second)
  );
}

/* =========================================
   PROOF HELPERS
========================================= */

function latestProof(skillId) {
  return proofs
    .filter(proof => proof.userSkillId === skillId)
    .sort((a, b) =>
      String(b.createdAt || "").localeCompare(
        String(a.createdAt || "")
      )
    )[0] || null;
}

/* =========================================
   SKILL CATALOGUE
========================================= */

function setupCatalogue() {
  for (const category of Object.keys(CATALOGUE)) {
    $("category").add(
      new Option(category, category)
    );
  }
}

function updateOptions() {
  const category = $("category").value;
  const select = $("skillName");

  select.replaceChildren(
    new Option(
      category
        ? "Choose a skill"
        : "Choose category first",
      ""
    )
  );

  select.disabled = !category;

  for (const name of CATALOGUE[category] || []) {
    select.add(new Option(name, name));
  }

  if (category) {
    select.add(
      new Option("Add Custom Skill", "__custom__")
    );
  }

  if (category === "Other") {
    select.value = "__custom__";
  }

  updateCustom();
}

function updateCustom() {
  const isCustom =
    $("skillName").value === "__custom__";

  $("customSkillBox").hidden = !isCustom;
  $("customSkill").required = isCustom;

  if (!isCustom) {
    $("customSkill").value = "";
  }
}

/* =========================================
   CREATE OR UPDATE SKILL
========================================= */

function formSkill() {
  const category = $("category").value;

  const isCustom =
    $("skillName").value === "__custom__";

  const name = clean(
    isCustom
      ? $("customSkill").value
      : $("skillName").value
  );

  const type = selectedType();
  const proficiency = $("proficiency").value;

  const learningOutcomes =
    type === "teach"
      ? getLearningOutcomes()
      : [];

  if (
    !Object.prototype.hasOwnProperty.call(
      CATALOGUE,
      category
    ) ||
    !name ||
    !["teach", "learn"].includes(type) ||
    ![
      "beginner",
      "intermediate",
      "advanced"
    ].includes(proficiency)
  ) {
    message(
      "formMessage",
      "Complete every required field.",
      true
    );

    return null;
  }

  if (name.length > 60) {
    message(
      "formMessage",
      "Skill name must be at most 60 characters.",
      true
    );

    return null;
  }

  if (type === "teach") {
    if (learningOutcomes.length === 0) {
      message(
        "formMessage",
        "Add at least one learning outcome.",
        true
      );

      return null;
    }

    if (
      learningOutcomes.some(
        outcome => outcome.length < 20
      )
    ) {
      message(
        "formMessage",
        "Each learning outcome must contain at least 20 characters.",
        true
      );

      return null;
    }

    if (
      learningOutcomes.some(
        outcome => outcome.length > 200
      )
    ) {
      message(
        "formMessage",
        "Each learning outcome must be at most 200 characters.",
        true
      );

      return null;
    }
  }

  if (
    skills.some(skill =>
      skill.id !== editingId &&
      norm(skill.name) === norm(name) &&
      skill.type === type
    )
  ) {
    message(
      "formMessage",
      "You already added this skill for " + type + ".",
      true
    );

    return null;
  }

  const old = skills.find(
    skill => skill.id === editingId
  );

  const now = new Date().toISOString();

  const unchangedTeaching =
    old?.type === "teach" &&
    type === "teach" &&
    old.name === name &&
    old.category === category &&
    old.proficiency === proficiency &&
    sameOutcomes(
      getStoredOutcomes(old),
      learningOutcomes
    );

  return {
    id: old?.id || uid(),
    name,
    normalizedName: norm(name),
    category,
    type,
    proficiency,

    // Array of strings for schema compatibility.
    learningOutcomes,

    isCustom,

    verificationStatus:
      type === "teach"
        ? (
            unchangedTeaching
              ? old.verificationStatus
              : "unverified"
          )
        : null,

    createdAt: old?.createdAt || now,
    updatedAt: now
  };
}

function resetSkillForm() {
  $("skillForm").reset();

  editingId = null;

  $("formTitle").textContent =
    "Equip a New Skill";

  $("saveButton").textContent = "CONTINUE";
  $("cancelButton").hidden = true;

  clearOutcomeInputs();

  updateOptions();
  updateLearningOutcome();
}

function storeSkill(skill, removeProofs = false) {
  const previousSkills = skills;
  const previousProofs = proofs;

  skills = [
    ...skills.filter(
      item => item.id !== skill.id
    ),
    skill
  ];

  if (removeProofs) {
    proofs = proofs.filter(
      proof => proof.userSkillId !== skill.id
    );
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

  const old = skills.find(
    item => item.id === skill.id
  );

  if (skill.type === "teach") {
    const unchanged =
      old?.type === "teach" &&
      old.name === skill.name &&
      old.category === skill.category &&
      old.proficiency === skill.proficiency &&
      sameOutcomes(
        getStoredOutcomes(old),
        skill.learningOutcomes
      );

    if (unchanged) {
      if (!storeSkill(skill)) return;

      resetSkillForm();
      render();

      message(
        "formMessage",
        "Skill details saved."
      );

      return;
    }

    // New or changed teaching skills
    // must submit fresh proof.
    openProof(skill);
    return;
  }

  if (!storeSkill(skill, true)) return;

  resetSkillForm();
  render();

  message(
    "formMessage",
    "Learning skill saved to inventory."
  );
}

/* =========================================
   EDIT SKILL
========================================= */

function editSkill(id) {
  const skill = skills.find(
    item => item.id === id
  );

  if (!skill) return;

  editingId = id;

  $("category").value = skill.category;

  updateOptions();

  const predefined =
    CATALOGUE[skill.category] || [];

  const custom =
    skill.isCustom ||
    !predefined.includes(skill.name);

  $("skillName").value =
    custom ? "__custom__" : skill.name;

  updateCustom();

  if (custom) {
    $("customSkill").value = skill.name;
  }

  const radio = document.querySelector(
    'input[name="skillType"][value="' +
    skill.type +
    '"]'
  );

  if (radio) {
    radio.checked = true;
  }

  $("proficiency").value = skill.proficiency;

  setOutcomeInputs(
    getStoredOutcomes(skill)
  );

  updateLearningOutcome();

  $("formTitle").textContent =
    "Edit Your Skill";

  $("saveButton").textContent =
    "SAVE / CONTINUE";

  $("cancelButton").hidden = false;

  message(
    "formMessage",
    skill.type === "teach"
      ? "Changing teaching details requires fresh proof verification."
      : "Editing " + skill.name
  );

  $("skillEditor").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

/* =========================================
   DELETE SKILL
========================================= */

function deleteSkill(id) {
  const skill = skills.find(
    item => item.id === id
  );

  if (
    !skill ||
    !confirm('Delete "' + skill.name + '"?')
  ) {
    return;
  }

  const previousSkills = skills;
  const previousProofs = proofs;

  skills = skills.filter(
    item => item.id !== id
  );

  proofs = proofs.filter(
    proof => proof.userSkillId !== id
  );

  if (!save()) {
    skills = previousSkills;
    proofs = previousProofs;
    return;
  }

  if (editingId === id) {
    resetSkillForm();
  }

  render();

  message(
    "formMessage",
    "Skill deleted."
  );
}

/* =========================================
   DATE HELPER
========================================= */

function todayLocal() {
  const now = new Date();

  return new Date(
    now.getTime() -
    now.getTimezoneOffset() * 60000
  )
    .toISOString()
    .slice(0, 10);
}

/* =========================================
   DYNAMIC PROOF FIELDS
========================================= */

function renderProofFields() {
  const type = $("proofType").value;
  const container = $("dynamicProofFields");

  container.replaceChildren();

  message("proofMessage", "");

  const hints = {
    certificate:
      "Provide a public certificate verification URL.",

    github:
      "A public GitHub repository URL is required.",

    project:
      "Provide a public project or evidence URL.",

    portfolio:
      "A public portfolio URL is required.",

    achievement:
      "Provide a public achievement evidence URL."
  };

  $("proofHint").textContent =
    hints[type] ||
    "Choose a proof type to see the relevant fields.";

  for (const field of FIELD_SETS[type] || []) {
    const wrapper = document.createElement("div");
    wrapper.className = "field";

    const label = text(
      wrapper,
      "label",
      field.label +
      (field.required ? " *" : "")
    );

    label.htmlFor = field.id;

    const input = document.createElement(
      field.type === "textarea"
        ? "textarea"
        : "input"
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

    if (field.type === "text") {
      input.maxLength = 100;
    }

    if (field.type === "file") {
      input.accept =
        ".pdf,.png,.jpg,.jpeg,.webp";
    }

    if (field.type === "date") {
      input.max = todayLocal();
    }

    wrapper.appendChild(input);
    container.appendChild(wrapper);
  }
}

/* =========================================
   PROOF MODAL
========================================= */

function openProof(skill) {
  draft = {
    ...skill,
    learningOutcomes: [
      ...getStoredOutcomes(skill)
    ]
  };

  returnFocus = document.activeElement;

  $("proofForm").reset();

  renderProofFields();

  $("proofSkillLabel").textContent =
    skill.name + " - " + skill.proficiency;

  $("proofModal").hidden = false;

  document.body.classList.add(
    "modal-open"
  );

  $("proofType").focus();
}

function closeProof() {
  $("proofModal").hidden = true;

  document.body.classList.remove(
    "modal-open"
  );

  draft = null;

  if (returnFocus?.isConnected) {
    returnFocus.focus();
  }

  returnFocus = null;
}

/* =========================================
   PROOF VALIDATION
========================================= */

function validUrl(value, githubOnly = false) {
  try {
    const url = new URL(value);

    return (
      ["http:", "https:"].includes(
        url.protocol
      ) &&
      (
        !githubOnly ||
        [
          "github.com",
          "www.github.com"
        ].includes(
          url.hostname.toLowerCase()
        )
      )
    );
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
    message(
      "proofMessage",
      "Choose a proof type.",
      true
    );

    return;
  }

  const details = {};
  let fileInfo = null;

  for (const field of fields) {
    const input = $(field.id);

    if (field.type === "file") {
      const file = input.files[0];

      if (file) {
        const validExtension =
          /\.(pdf|png|jpe?g|webp)$/i.test(
            file.name
          );

        const validSize =
          file.size <= 5 * 1024 * 1024;

        if (
          !validExtension ||
          !validSize
        ) {
          message(
            "proofMessage",
            "Choose a PDF/image file up to 5 MB.",
            true
          );

          return;
        }

        // Demo: file bytes are NOT uploaded.
        fileInfo = {
          name: file.name,
          size: file.size,
          mimeType: file.type
        };
      }
    } else {
      const value = input.value.trim();

      if (
        field.required &&
        !value
      ) {
        message(
          "proofMessage",
          field.label + " is required.",
          true
        );

        return;
      }

      if (
        field.type === "url" &&
        value &&
        !validUrl(
          value,
          type === "github"
        )
      ) {
        message(
          "proofMessage",
          "Enter a valid public URL.",
          true
        );

        return;
      }

      if (
        field.type === "date" &&
        value > todayLocal()
      ) {
        message(
          "proofMessage",
          "The date cannot be in the future.",
          true
        );

        return;
      }

      details[field.id] = value;
    }
  }

  const externalUrl =
    details.proofUrl || "";

  if (!externalUrl) {
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

    title:
      details.proofTitle ||
      details.certificateName ||
      "",

    description:
      details.proofDescription || "",

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
    learningOutcomes: [
      ...getStoredOutcomes(draft)
    ],
    verificationStatus: "pending",
    updatedAt: now
  };

  const previousSkills = skills;
  const previousProofs = proofs;

  skills = [
    ...skills.filter(
      item => item.id !== skill.id
    ),
    skill
  ];

  proofs = [
    ...proofs.filter(
      item => item.userSkillId !== skill.id
    ),
    proof
  ];

  // TODO: Submit through Convex
  // with authenticated user ID.

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

/* =========================================
   SKILL CARD
========================================= */

function card(skill, queue = false) {
  const status =
    skill.verificationStatus ||
    "unverified";

  const box = document.createElement(
    "article"
  );

  box.className =
    "card " +
    (
      skill.type === "learn"
        ? "learn"
        : status
    );

  text(
    box,
    "h4",
    skill.name
  );

  text(
    box,
    "p",
    skill.category
  );

  /* Display multiple learning outcomes */

  if (skill.type === "teach") {
    const outcomes =
      getStoredOutcomes(skill);

    if (outcomes.length > 0) {
      const outcomeBox =
        document.createElement("div");

      outcomeBox.className =
        "learning-outcome";

      text(
        outcomeBox,
        "strong",
        "Expected Learning Outcomes"
      );

      const list =
        document.createElement("ol");

      outcomes.forEach(outcome => {
        text(
          list,
          "li",
          outcome
        );
      });

      outcomeBox.appendChild(list);
      box.appendChild(outcomeBox);
    }
  }

  const tags = document.createElement(
    "div"
  );

  tags.className = "tags";

  text(
    tags,
    "span",
    skill.proficiency,
    "tag"
  );

  if (skill.type === "teach") {
    const labels = {
      verified: "Verified",
      pending: "Pending Review",
      rejected: "Rejected",
      unverified: "Unverified"
    };

    text(
      tags,
      "span",
      labels[status] || "Unverified",
      "tag " + status
    );
  } else {
    text(
      tags,
      "span",
      "Learning",
      "tag"
    );
  }

  box.appendChild(tags);

  const proof = latestProof(
    skill.id
  );

  if (
    queue &&
    status === "rejected"
  ) {
    text(
      box,
      "p",
      "Reason: " +
      (
        proof?.adminComment ||
        "Please resubmit evidence."
      )
    );
  }

  if (
    queue &&
    status === "pending"
  ) {
    text(
      box,
      "p",
      "Proof submitted; awaiting admin review."
    );
  }

  const actions = document.createElement(
    "div"
  );

  actions.className = "actions";

  if (
    queue &&
    [
      "unverified",
      "rejected"
    ].includes(status)
  ) {
    button(
      actions,
      "Submit Proof",
      () => openProof(skill)
    );
  }

  button(
    actions,
    "Edit",
    () => editSkill(skill.id)
  );

  button(
    actions,
    "Delete",
    () => deleteSkill(skill.id),
    "danger"
  );

  box.appendChild(actions);

  return box;
}

/* =========================================
   RENDER LISTS
========================================= */

function fillList(
  id,
  items,
  emptyLabel,
  queue = false
) {
  const root = $(id);

  root.replaceChildren();

  if (!items.length) {
    text(
      root,
      "div",
      emptyLabel,
      "empty"
    );

    return;
  }

  items.forEach(skill => {
    root.appendChild(
      card(skill, queue)
    );
  });
}

function render() {
  const teaching = skills.filter(
    skill =>
      skill.type === "teach" &&
      skill.verificationStatus === "verified"
  );

  const learning = skills.filter(
    skill => skill.type === "learn"
  );

  const queue = skills.filter(
    skill =>
      skill.type === "teach" &&
      skill.verificationStatus !== "verified"
  );

  $("teachCount").textContent =
    teaching.length;

  $("learnCount").textContent =
    learning.length;

  $("pendingCount").textContent =
    queue.filter(
      skill =>
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

/* =========================================
   EVENT LISTENERS
========================================= */

$("category").addEventListener(
  "change",
  updateOptions
);

$("skillName").addEventListener(
  "change",
  updateCustom
);

document.querySelectorAll(
  'input[name="skillType"]'
).forEach(radio => {
  radio.addEventListener(
    "change",
    updateLearningOutcome
  );
});

$("addOutcomeButton").addEventListener(
  "click",
  () => addOutcome()
);

$("skillForm").addEventListener(
  "submit",
  handleSkillSubmit
);

$("cancelButton").addEventListener(
  "click",
  () => {
    resetSkillForm();
    message("formMessage", "");
  }
);

$("proofType").addEventListener(
  "change",
  renderProofFields
);

$("proofForm").addEventListener(
  "submit",
  submitProof
);

$("closeProofButton").addEventListener(
  "click",
  closeProof
);

$("cancelProofButton").addEventListener(
  "click",
  closeProof
);

document.addEventListener(
  "keydown",
  event => {
    if (
      event.key === "Escape" &&
      !$("proofModal").hidden
    ) {
      closeProof();
    }
  }
);

window.addEventListener(
  "storage",
  event => {
    if (
      event.key === SKILLS_KEY ||
      event.key === PROOFS_KEY
    ) {
      skills = read(SKILLS_KEY);
      proofs = read(PROOFS_KEY);
      render();
    }
  }
);
setupCatalogue();
updateOptions();
updateLearningOutcome();
render();
