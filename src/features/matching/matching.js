const DEFAULT_LEVEL_ORDER = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

const WEIGHTS = {
  skills: 50,
  proficiency: 30,
  availability: 20,
};

export function getUserId(user) {
  if (!user || typeof user !== "object") return null;
  // Convex document IDs are the profile identity. clerkId is auth identity,
  // and should not be used as a public match/profile ID.
  return user._id ?? user.userId ?? user.id ?? null;
}

export function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Adapt the suggested users + userSkills + skills + proofs records into the
 * normalized profile shape used by this deterministic matcher.
 * `proofs` should contain proof records visible to this caller; only a
 * proof with status "verified" produces a verified skill badge.
 */
export function toMatcherProfile(user, userSkills = [], skills = [], proofs = []) {
  if (!user || typeof user !== "object") return null;

  const userId = getUserId(user);
  const skillById = new Map(
    skills
      .filter((skill) => skill && (skill._id ?? skill.id) != null)
      .map((skill) => [String(skill._id ?? skill.id), skill]),
  );
  const userSkillRows = userSkills.filter(
    (row) => String(row?.userId ?? "") === String(userId ?? ""),
  );

  const normalizedSkills = userSkillRows.flatMap((row) => {
    const skillId = row.skillId ?? row.skill?._id ?? row.skill?.id;
    const catalogueSkill = skillById.get(String(skillId ?? "")) ?? row.skill;
    if (!catalogueSkill) return [];

    const verificationStatus = row.verificationStatus ?? (
      proofs.find(
        (proof) =>
          String(proof?.userSkillId ?? "") === String(row._id ?? row.id ?? ""),
      )?.status
    ) ?? "unverified";
    const verified = verificationStatus === "verified";

    return [{
      userSkillId: row._id ?? row.id ?? null,
      skillId,
      name: catalogueSkill.name ?? catalogueSkill.normalizedName ?? "Unknown skill",
      normalizedName: catalogueSkill.normalizedName,
      category: catalogueSkill.category,
      type: row.type,
      proficiency: row.proficiency,
      description: row.description,
      learningOutcomes: Array.isArray(row.learningOutcomes) ? row.learningOutcomes : [],
      verificationStatus,
      verified,
    }];
  });

  return {
    userId,
    name: user.name ?? user.username ?? "User",
    bio: user.bio ?? "",
    profileImage: user.profileImage ?? null,
    profileVisibility: user.profileVisibility,
    // Keep the readable value for display; scoring uses structured weekly slots.
    availability: user.availability,
    timeZone: user.timeZone ?? user.availabilityTimeZone,
    availabilitySlots: Array.isArray(user.availabilitySlots)
      ? user.availabilitySlots
      : Array.isArray(user.availability)
        ? user.availability
        : undefined,
    reputationScore: user.reputationScore,
    preferredLanguage: user.preferredLanguage,
    subscriptionTier: user.subscriptionTier,
    skills: normalizedSkills,
  };
}

function getSkillCollection(user, type) {
  const skillType = normalizeText(type);
  const directSkills = Array.isArray(user?.skills) ? user.skills : [];

  if (directSkills.length > 0) {
    return directSkills.filter((skill) => {
      if (!skill || typeof skill !== "object") return false;
      return normalizeText(skill.type) === skillType;
    });
  }

  const fieldName = skillType === "teach" ? "teachingSkills" : "learningSkills";
  const alternateSkills = Array.isArray(user?.[fieldName]) ? user[fieldName] : [];

  return alternateSkills.map((skill) => ({
    ...skill,
    type: skillType,
  }));
}

export function getSkillKey(skill) {
  if (!skill || typeof skill !== "object") return null;

  if (skill.skillId != null || skill.id != null) {
    return `id:${skill.skillId ?? skill.id}`;
  }

  const name = skill.normalizedName ?? skill.name;
  return name ? `name:${normalizeText(name)}` : null;
}

export function getDisplaySkillName(skill) {
  if (!skill || typeof skill !== "object") return "Unknown skill";
  return skill.name ?? skill.normalizedName ?? String(skill.skillId ?? skill.id ?? "Unknown skill");
}

export function getUniqueSkills(user, type) {
  const unique = new Map();

  for (const skill of getSkillCollection(user, type)) {
    if (!skill || typeof skill !== "object") continue;

    const key = getSkillKey(skill);
    if (!key || unique.has(key)) continue;
    unique.set(key, skill);
  }

  return unique;
}

export function compareSkillLists(teacherSkills, learnerSkills) {
  const matches = [];

  for (const [key, learnerSkill] of learnerSkills) {
    const teacherSkill = teacherSkills.get(key);

    if (teacherSkill) {
      matches.push({
        key,
        teacherSkill,
        learnerSkill,
        name: getDisplaySkillName(learnerSkill),
      });
    }
  }

  return matches;
}

export function roundToOneDecimal(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10) / 10;
}

export function calculateProficiencyFit(matches, levelOrder = DEFAULT_LEVEL_ORDER) {
  const fits = [];

  for (const match of matches) {
    const teacherSkill = match?.teacherSkill ?? {};
    const learnerSkill = match?.learnerSkill ?? {};

    const teacherLevel = levelOrder[normalizeText(teacherSkill.proficiency)];
    const learnerLevel = levelOrder[normalizeText(learnerSkill.proficiency)];

    if (teacherLevel == null || learnerLevel == null) continue;

    if (teacherLevel > learnerLevel) {
      fits.push(1);
    } else if (teacherLevel === learnerLevel) {
      fits.push(0.5);
    } else {
      fits.push(0);
    }
  }

  if (fits.length === 0) return null;

  return fits.reduce((sum, fit) => sum + fit, 0) / fits.length;
}

function getZonedDateParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

function localDateTimeToTimestamp(dateParts, minuteOfDay, timeZone) {
  let { year, month, day } = dateParts;
  let hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;

  if (hour >= 24) {
    const nextDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) + 1));
    year = nextDate.getUTCFullYear();
    month = nextDate.getUTCMonth() + 1;
    day = nextDate.getUTCDate();
    hour -= 24;
  }

  const targetAsUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), hour, minute);
  let timestamp = targetAsUtc;

  // Resolve the UTC instant represented by this local wall-clock time. The
  // iteration also accounts for daylight-saving offset changes.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const zoned = getZonedDateParts(new Date(timestamp), timeZone);
    const representedAsUtc = Date.UTC(
      Number(zoned.year),
      Number(zoned.month) - 1,
      Number(zoned.day),
      Number(zoned.hour),
      Number(zoned.minute),
    );
    const difference = targetAsUtc - representedAsUtc;
    if (difference === 0) return timestamp;
    timestamp += difference;
  }

  // Skip nonexistent local times during a daylight-saving transition.
  return null;
}

function mergeIntervals(intervals) {
  const sorted = intervals
    .filter((interval) => interval.end > interval.start)
    .sort((a, b) => a.start - b.start);
  const merged = [];

  for (const interval of sorted) {
    const previous = merged[merged.length - 1];
    if (previous && interval.start <= previous.end) {
      previous.end = Math.max(previous.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }

  return merged;
}

function getStructuredAvailability(user, now = Date.now(), days = 14) {
  const slots = user?.availabilitySlots;
  const timeZone = user?.timeZone ?? user?.availabilityTimeZone;
  if (!Array.isArray(slots) || slots.length === 0 || !timeZone) return null;

  const validSlots = slots.filter((slot) =>
    slot &&
    Number.isInteger(slot.dayOfWeek) && slot.dayOfWeek >= 0 && slot.dayOfWeek <= 6 &&
    Number.isInteger(slot.startMinute) && slot.startMinute >= 0 && slot.startMinute < 1440 &&
    Number.isInteger(slot.endMinute) && slot.endMinute > slot.startMinute && slot.endMinute <= 1440,
  );
  if (validSlots.length === 0) return null;

  try {
    const todayParts = getZonedDateParts(new Date(now), timeZone);
    const baseDate = new Date(Date.UTC(
      Number(todayParts.year),
      Number(todayParts.month) - 1,
      Number(todayParts.day),
    ));
    const intervals = [];

    for (let offset = 0; offset < days; offset += 1) {
      const localDate = new Date(baseDate);
      localDate.setUTCDate(baseDate.getUTCDate() + offset);
      const dateParts = {
        year: localDate.getUTCFullYear(),
        month: localDate.getUTCMonth() + 1,
        day: localDate.getUTCDate(),
      };
      const dayOfWeek = localDate.getUTCDay();

      for (const slot of validSlots) {
        if (slot.dayOfWeek !== dayOfWeek) continue;
        const start = localDateTimeToTimestamp(dateParts, slot.startMinute, timeZone);
        const end = localDateTimeToTimestamp(dateParts, slot.endMinute, timeZone);
        if (start == null || end == null || end <= now) continue;
        intervals.push({ start: Math.max(start, now), end });
      }
    }

    return mergeIntervals(intervals);
  } catch {
    // Invalid or unsupported time-zone identifiers mean availability is unknown.
    return null;
  }
}

function calculateLegacyAvailabilityFit(slotsA, slotsB) {
  const setA = new Set(slotsA.map((slot) => normalizeText(slot)).filter(Boolean));
  const setB = new Set(slotsB.map((slot) => normalizeText(slot)).filter(Boolean));
  const sharedSlots = [...setA].filter((slot) => setB.has(slot));
  const denominator = Math.min(setA.size, setB.size);

  return {
    fit: denominator === 0 ? 0 : Math.min(1, sharedSlots.length / denominator),
    sharedSlots,
  };
}

export function calculateAvailabilityFit(userA, userB, options = {}) {
  const slotsA = userA?.availabilitySlots ?? userA?.availability;
  const slotsB = userB?.availabilitySlots ?? userB?.availability;

  // Preserve support for the previous exact-label format while profiles move
  // to structured weekly slots.
  if (Array.isArray(slotsA) && slotsA.length > 0 &&
      Array.isArray(slotsB) && slotsB.length > 0 &&
      slotsA.every((slot) => typeof slot === "string") &&
      slotsB.every((slot) => typeof slot === "string")) {
    return calculateLegacyAvailabilityFit(slotsA, slotsB);
  }

  const now = options.now ?? Date.now();
  const intervalsA = getStructuredAvailability(userA, now, options.days ?? 14);
  const intervalsB = getStructuredAvailability(userB, now, options.days ?? 14);
  if (intervalsA == null || intervalsB == null) {
    return { fit: null, sharedSlots: [], sharedMinutes: 0 };
  }

  const totalMinutes = (intervals) =>
    intervals.reduce((total, interval) => total + (interval.end - interval.start) / 60000, 0);
  const totalA = totalMinutes(intervalsA);
  const totalB = totalMinutes(intervalsB);
  const sharedSlots = [];
  let indexA = 0;
  let indexB = 0;

  while (indexA < intervalsA.length && indexB < intervalsB.length) {
    const a = intervalsA[indexA];
    const b = intervalsB[indexB];
    const start = Math.max(a.start, b.start);
    const end = Math.min(a.end, b.end);

    if (end > start) {
      sharedSlots.push({
        startAt: new Date(start).toISOString(),
        endAt: new Date(end).toISOString(),
        minutes: (end - start) / 60000,
      });
    }

    if (a.end <= b.end) indexA += 1;
    else indexB += 1;
  }

  const sharedMinutes = sharedSlots.reduce((total, slot) => total + slot.minutes, 0);
  const denominator = Math.min(totalA, totalB);
  return {
    fit: denominator === 0 ? 0 : Math.min(1, sharedMinutes / denominator),
    sharedSlots,
    sharedMinutes,
  };
}

export function buildReason(matchType, skillsTheyCanTeach, skillsYouCanTeach, components) {
  const parts = [
    matchType === "reciprocal" ? "Reciprocal skill match" : "One-way skill match",
  ];

  if (Array.isArray(skillsTheyCanTeach) && skillsTheyCanTeach.length > 0) {
    parts.push(`they can teach you ${skillsTheyCanTeach.join(", ")}`);
  }

  if (Array.isArray(skillsYouCanTeach) && skillsYouCanTeach.length > 0) {
    parts.push(`you can teach them ${skillsYouCanTeach.join(", ")}`);
  }

  if (components?.proficiency?.fit != null) {
    parts.push("proficiency included");
  }

  if (
    components?.availability?.fit != null &&
    Array.isArray(components.availability.sharedSlots) &&
    components.availability.sharedSlots.length > 0
  ) {
    parts.push(`${components.availability.sharedSlots.length} shared time slot(s)`);
  }

  return parts.join("; ");
}

export function rankMatches(currentUser, candidates, options = {}) {
  const levelOrder = options.levelOrder ?? DEFAULT_LEVEL_ORDER;
  const excludedIds = new Set((options.excludeUserIds ?? []).map(String));

  const currentUserId = getUserId(currentUser);
  const currentTeaches = getUniqueSkills(currentUser, "teach");
  const currentLearns = getUniqueSkills(currentUser, "learn");

  const results = [];

  if (!Array.isArray(candidates)) return results;

  for (const candidate of candidates) {
    const candidateId = getUserId(candidate);

    if (!candidate || !candidateId) continue;
    if (String(candidateId) === String(currentUserId)) continue;
    if (excludedIds.has(String(candidateId))) continue;
    if (options.isEligible && !options.isEligible(candidate)) continue;

    const candidateTeaches = getUniqueSkills(candidate, "teach");
    const candidateLearns = getUniqueSkills(candidate, "learn");

    const theyTeachYou = compareSkillLists(candidateTeaches, currentLearns);
    const youTeachThem = compareSkillLists(currentTeaches, candidateLearns);

    if (theyTeachYou.length === 0 && youTeachThem.length === 0) {
      continue;
    }

    const coverageYouTeachThem =
      candidateLearns.size === 0 ? 0 : youTeachThem.length / candidateLearns.size;

    const coverageTheyTeachYou =
      currentLearns.size === 0 ? 0 : theyTeachYou.length / currentLearns.size;

    const skillFit = (coverageYouTeachThem + coverageTheyTeachYou) / 2;

    const allMatchedSkills = [...theyTeachYou, ...youTeachThem];
    const proficiencyFit = calculateProficiencyFit(allMatchedSkills, levelOrder);
    const availability = calculateAvailabilityFit(currentUser, candidate);

    const skillPoints = WEIGHTS.skills * skillFit;
    const proficiencyPoints =
      proficiencyFit == null ? null : WEIGHTS.proficiency * proficiencyFit;
    const availabilityPoints =
      availability.fit == null ? null : WEIGHTS.availability * availability.fit;

    const earnedPoints =
      skillPoints +
      (proficiencyPoints ?? 0) +
      (availabilityPoints ?? 0);

    const availableWeight =
      WEIGHTS.skills +
      (proficiencyPoints == null ? 0 : WEIGHTS.proficiency) +
      (availabilityPoints == null ? 0 : WEIGHTS.availability);

    const score = availableWeight > 0 ? (earnedPoints / availableWeight) * 100 : 0;
    const matchType =
      theyTeachYou.length > 0 && youTeachThem.length > 0 ? "reciprocal" : "one-way";

    const skillsTheyCanTeach = theyTeachYou.map((match) => match.name);
    const skillsYouCanTeach = youTeachThem.map((match) => match.name);
    const skillsTheyCanTeachDetails = theyTeachYou.map(({ teacherSkill }) => ({
      skillId: teacherSkill.skillId ?? teacherSkill.id ?? null,
      name: getDisplaySkillName(teacherSkill),
      proficiency: teacherSkill.proficiency ?? null,
      verificationStatus: teacherSkill.verificationStatus ?? (teacherSkill.verified ? "verified" : "unverified"),
      verified: Boolean(teacherSkill.verified || teacherSkill.verificationStatus === "verified"),
      learningOutcomes: Array.isArray(teacherSkill.learningOutcomes) ? teacherSkill.learningOutcomes : [],
    }));
    const skillsYouCanTeachDetails = youTeachThem.map(({ teacherSkill }) => ({
      skillId: teacherSkill.skillId ?? teacherSkill.id ?? null,
      name: getDisplaySkillName(teacherSkill),
      proficiency: teacherSkill.proficiency ?? null,
      verificationStatus: teacherSkill.verificationStatus ?? (teacherSkill.verified ? "verified" : "unverified"),
      verified: Boolean(teacherSkill.verified || teacherSkill.verificationStatus === "verified"),
      learningOutcomes: Array.isArray(teacherSkill.learningOutcomes) ? teacherSkill.learningOutcomes : [],
    }));

    const components = {
      skills: {
        points: roundToOneDecimal(skillPoints),
        maxPoints: WEIGHTS.skills,
        coverageYouTeachThem: roundToOneDecimal(coverageYouTeachThem * 100),
        coverageTheyTeachYou: roundToOneDecimal(coverageTheyTeachYou * 100),
      },
      proficiency: {
        points: proficiencyPoints == null ? null : roundToOneDecimal(proficiencyPoints),
        maxPoints: WEIGHTS.proficiency,
        fit: proficiencyFit == null ? null : roundToOneDecimal(proficiencyFit * 100),
      },
      availability: {
        points: availabilityPoints == null ? null : roundToOneDecimal(availabilityPoints),
        maxPoints: WEIGHTS.availability,
        fit: availability.fit == null ? null : roundToOneDecimal(availability.fit * 100),
        sharedSlots: availability.fit == null ? [] : availability.sharedSlots,
      },
    };

    results.push({
      userId: candidateId,
      name: candidate.name ?? candidate.displayName ?? "User",
      matchType,
      score: roundToOneDecimal(score),
      provisional: proficiencyPoints == null || availabilityPoints == null,
      skillsTheyCanTeach,
      skillsYouCanTeach,
      skillsTheyCanTeachDetails,
      skillsYouCanTeachDetails,
      components,
      reason: buildReason(matchType, skillsTheyCanTeach, skillsYouCanTeach, components),
    });
  }

  return results.sort((a, b) => {
    const reciprocalRank = (match) => (match.matchType === "reciprocal" ? 0 : 1);

    return (
      reciprocalRank(a) - reciprocalRank(b) ||
      b.score - a.score ||
      String(a.name).localeCompare(String(b.name))
    );
  });
}

/** Return the compatibility result for one candidate, or null if no skills match. */
export function calculateCompatibility(currentUser, candidate, options = {}) {
  return rankMatches(currentUser, candidate ? [candidate] : [], options)[0] ?? null;
}

// Alias matching the function name in the pasted schema notes.
export function calculateMatch(currentUser, candidate, options = {}) {
  return calculateCompatibility(currentUser, candidate, options);
}

/** Generate ranked recommendations from already-loaded profile records. */
export function generateMatches(currentUser, candidates, options = {}) {
  return rankMatches(currentUser, candidates, options);
}

/** Filter already-loaded `matches` table rows for either participant. */
export function getMatchesForUser(userId, matchRecords = []) {
  if (userId == null || !Array.isArray(matchRecords)) return [];
  return matchRecords.filter(
    (match) =>
      String(match?.userAId ?? '') === String(userId) ||
      String(match?.userBId ?? '') === String(userId),
  );
}

/**
 * Convert a ranked recommendation to the matches table shape.
 * Persistence and match retrieval remain backend responsibilities.
 */
export function toMatchRecord(userA, userB, match, now = Date.now()) {
  const userAId = getUserId(userA);
  const userBId = getUserId(userB);
  if (!match || userAId == null || userBId == null) return null;

  const matchingSkills = [
    ...(match.skillsYouCanTeachDetails ?? []).map((skill) => ({
      skillId: skill.skillId,
      teacherId: userAId,
      learnerId: userBId,
    })),
    ...(match.skillsTheyCanTeachDetails ?? []).map((skill) => ({
      skillId: skill.skillId,
      teacherId: userBId,
      learnerId: userAId,
    })),
  ].filter((skill) => skill.skillId != null);

  return {
    userAId,
    userBId,
    score: match.score,
    matchingSkills,
    status: "suggested",
    createdAt: now,
    updatedAt: now,
  };
}
