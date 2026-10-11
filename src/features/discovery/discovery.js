import {
  generateMatches,
  getUserId,
  toMatcherProfile,
} from '../matching/matching.js'
import './discovery.css'

// Sample rows mirror the proposed Convex tables. Replace these fixtures with
// Sanskriti's confirmed queries; do not treat them as the deployed schema.
function weeklySlots(days, startMinute, endMinute) {
  return days.map((dayOfWeek) => ({ dayOfWeek, startMinute, endMinute }))
}

const users = [
  { _id: 'user_you', clerkId: 'clerk_you', name: 'You', bio: 'Learning backend development.', availability: 'Weekday evenings, 6:00–9:00 PM IST', timeZone: 'Asia/Kolkata', availabilitySlots: weeklySlots([1, 2, 3, 4, 5], 1080, 1260), profileVisibility: 'public', reputationScore: 0, preferredLanguage: 'English', subscriptionTier: 'premium' },
  { _id: 'user_alex', clerkId: 'clerk_alex', name: 'Alex Morgan', bio: 'Frontend developer who enjoys practical, project based learning.', availability: 'Weekday evenings, 6:00–9:00 PM IST', timeZone: 'Asia/Kolkata', availabilitySlots: weeklySlots([1, 2, 3, 4, 5], 1080, 1260), profileVisibility: 'public', reputationScore: 4.5, preferredLanguage: 'English', subscriptionTier: 'free' },
  { _id: 'user_maya', clerkId: 'clerk_maya', name: 'Maya Chen', bio: 'Building accessible web products and sharing what I learn.', availability: 'Weekends, 10:00 AM–2:00 PM IST', timeZone: 'Asia/Kolkata', availabilitySlots: weeklySlots([0, 6], 600, 840), profileVisibility: 'public', reputationScore: 5, preferredLanguage: 'English', subscriptionTier: 'premium' },
  { _id: 'user_jordan', clerkId: 'clerk_jordan', name: 'Jordan Lee', bio: 'Designer learning to bring ideas to life with code.', availability: 'Weekday evenings, 7:00–9:00 PM IST', timeZone: 'Asia/Kolkata', availabilitySlots: weeklySlots([1, 2, 3, 4, 5], 1140, 1260), profileVisibility: 'public', reputationScore: 0, preferredLanguage: 'English', subscriptionTier: 'free' },
]

const skills = [
  { _id: 'skill_js', name: 'JavaScript', normalizedName: 'javascript', category: 'Programming' },
  { _id: 'skill_node', name: 'Node.js', normalizedName: 'node.js', category: 'Programming' },
  { _id: 'skill_figma', name: 'Figma', normalizedName: 'figma', category: 'Design' },
  { _id: 'skill_css', name: 'CSS', normalizedName: 'css', category: 'Programming' },
  { _id: 'skill_illustration', name: 'Illustration', normalizedName: 'illustration', category: 'Design' },
]

const userSkills = [
  { _id: 'us_you_js', userId: 'user_you', skillId: 'skill_js', type: 'teach', proficiency: 'advanced', verificationStatus: 'unverified', learningOutcomes: ['Build reusable JavaScript functions and interactive browser features.'] },
  { _id: 'us_you_node', userId: 'user_you', skillId: 'skill_node', type: 'learn', proficiency: 'beginner', verificationStatus: 'unverified', learningOutcomes: ['Build and run a basic Node.js API.'] },
  { _id: 'us_you_figma', userId: 'user_you', skillId: 'skill_figma', type: 'learn', proficiency: 'beginner', verificationStatus: 'unverified', learningOutcomes: ['Create a wireframe and prototype for a small app.'] },
  { _id: 'us_you_css', userId: 'user_you', skillId: 'skill_css', type: 'learn', proficiency: 'beginner', verificationStatus: 'unverified', learningOutcomes: ['Build a responsive web page.'] },
  { _id: 'us_alex_js', userId: 'user_alex', skillId: 'skill_js', type: 'learn', proficiency: 'intermediate', verificationStatus: 'unverified', learningOutcomes: ['Write maintainable asynchronous JavaScript.'] },
  { _id: 'us_alex_node', userId: 'user_alex', skillId: 'skill_node', type: 'teach', proficiency: 'advanced', verificationStatus: 'verified', learningOutcomes: [] },
  { _id: 'us_alex_figma', userId: 'user_alex', skillId: 'skill_figma', type: 'teach', proficiency: 'intermediate', verificationStatus: 'unverified', learningOutcomes: ['Create a wireframe and clickable prototype for a small app.'] },
  { _id: 'us_alex_css', userId: 'user_alex', skillId: 'skill_css', type: 'teach', proficiency: 'advanced', verificationStatus: 'unverified', learningOutcomes: ['Build responsive page layouts.', 'Use accessible focus and hover states.'] },
  { _id: 'us_maya_js', userId: 'user_maya', skillId: 'skill_js', type: 'learn', proficiency: 'beginner', verificationStatus: 'unverified', learningOutcomes: ['Understand JavaScript fundamentals for the browser.'] },
  { _id: 'us_maya_node', userId: 'user_maya', skillId: 'skill_node', type: 'teach', proficiency: 'intermediate', verificationStatus: 'unverified', learningOutcomes: ['Build a small Node.js service and understand its request flow.'] },
  { _id: 'us_maya_css', userId: 'user_maya', skillId: 'skill_css', type: 'teach', proficiency: 'advanced', verificationStatus: 'under_review', learningOutcomes: ['Create responsive layouts and accessible visual states with CSS.'] },
  { _id: 'us_jordan_js', userId: 'user_jordan', skillId: 'skill_js', type: 'learn', proficiency: 'beginner', verificationStatus: 'unverified', learningOutcomes: ['Add basic interactions to a portfolio page.'] },
  { _id: 'us_jordan_node', userId: 'user_jordan', skillId: 'skill_node', type: 'learn', proficiency: 'beginner', verificationStatus: 'unverified', learningOutcomes: ['Understand the basics of a server-side JavaScript app.'] },
  { _id: 'us_jordan_art', userId: 'user_jordan', skillId: 'skill_illustration', type: 'teach', proficiency: 'advanced', verificationStatus: 'under_review', learningOutcomes: ['Sketch a character and refine it into a polished digital illustration.'] },
]

const proofs = [
  { _id: 'proof_alex_node', userId: 'user_alex', userSkillId: 'us_alex_node', type: 'github', title: 'Node.js projects', status: 'verified' },
  { _id: 'proof_maya_css', userId: 'user_maya', userSkillId: 'us_maya_css', type: 'portfolio', title: 'CSS portfolio', status: 'submitted' },
  { _id: 'proof_jordan_art', userId: 'user_jordan', userSkillId: 'us_jordan_art', type: 'portfolio', title: 'Illustration portfolio', status: 'under_review' },
]

// Sample completed-session reviews. Replace with the backend reviews query.
const reviews = [
  { _id: 'review_alex_1', sessionId: 'session_alex_1', reviewerId: 'user_you', revieweeId: 'user_alex', rating: 5, comment: 'Clear, practical Node.js guidance.', createdAt: Date.now(), updatedAt: Date.now() },
  { _id: 'review_alex_2', sessionId: 'session_alex_2', reviewerId: 'user_maya', revieweeId: 'user_alex', rating: 4, comment: 'Helpful examples and explanations.', createdAt: Date.now(), updatedAt: Date.now() },
  { _id: 'review_maya_1', sessionId: 'session_maya_1', reviewerId: 'user_you', revieweeId: 'user_maya', rating: 5, comment: 'Excellent CSS walkthrough.', createdAt: Date.now(), updatedAt: Date.now() },
]

const currentUserRecord = users[0]
const currentUser = toMatcherProfile(currentUserRecord, userSkills, skills, proofs)
const profiles = users
  .slice(1)
  // These fixtures represent profiles already approved for discovery. The
  // backend candidate query must enforce the real profileVisibility policy.
  .map((user) => toMatcherProfile(user, userSkills, skills, proofs))

// Sample connections use the proposed connections table fields/statuses.
const connections = [
  { _id: 'connection_maya_you', requesterId: 'user_maya', receiverId: 'user_you', status: 'pending' },
  { _id: 'connection_you_jordan', requesterId: 'user_you', receiverId: 'user_jordan', status: 'pending' },
]

const app = document.querySelector('#app')
const state = {
  query: '',
  direction: 'all',
  verifiedOnly: false,
  status: 'loading',
  error: false,
  profiles,
  connections,
  sendingUserId: null,
  connectionErrors: {},
}

app.innerHTML = `
  <main class="discovery">
    <header class="discovery-header">
      <div>
        <p class="eyebrow">SKILL BARTER</p>
        <h1>Find your people</h1>
        <p class="subtitle">Trade what you know for what you want to learn.</p>
      </div>
      <div class="discovery-actions"><a class="sessions-nav" href="./src/features/sessions/sessions.html">Sessions &amp; credits</a><div class="avatar" aria-label="Your profile">S</div></div>
    </header>
    <section class="discovery-tools" aria-label="Search and filters">
      <label class="search-box">
        <span aria-hidden="true">⌕</span>
        <input
          id="search"
          type="search"
          placeholder="Search people or skills…"
          aria-label="Search by name or skill"
        >
      </label>
      <label class="select-label" for="direction">Skill direction</label>
      <select id="direction">
        <option value="all">Any direction</option>
        <option value="teach">Can teach me</option>
        <option value="learn">Wants to learn</option>
      </select>
      <label class="verified-filter">
        <input id="verified" type="checkbox">
        <span>Verified skills</span>
      </label>
      <span class="sort-label">↕ Reciprocal matches first</span>
    </section>
    <div id="notice" role="status" aria-live="polite"></div>
    <section id="results" class="match-grid" aria-label="Skill partners"></section>
    <p class="demo-note">Preview uses sample profiles. Connection actions are not sent to a backend yet.</p>
  </main>
  <dialog id="profile-dialog" class="profile-dialog">
    <button class="dialog-close" aria-label="Close">×</button>
    <div id="profile-details"></div>
  </dialog>
`

const results = document.querySelector('#results')
const notice = document.querySelector('#notice')
const search = document.querySelector('#search')
const direction = document.querySelector('#direction')
const verified = document.querySelector('#verified')

function skillList(profile, type) {
  return profile.skills.filter((skill) => skill.type === type)
}

function getRatingSummary(userId) {
  const received = reviews.filter((review) => String(review.revieweeId) === String(userId))
  if (!received.length) return null
  const average = received.reduce((total, review) => total + review.rating, 0) / received.length
  return { average: average.toFixed(1), count: received.length }
}

function isVisibleInDiscovery(profile) {
  if (profile.profileVisibility === 'public') return true
  if (profile.profileVisibility !== 'connections') return false
  return state.connections.some(
    (connection) =>
      connection.status === 'accepted' &&
      ((String(connection.requesterId) === String(currentUser.userId) && String(connection.receiverId) === String(profile.userId)) ||
        (String(connection.receiverId) === String(currentUser.userId) && String(connection.requesterId) === String(profile.userId))),
  )
}

function getConnectionStatus(candidateId) {
  if (String(state.sendingUserId) === String(candidateId)) return 'sending'
  if (state.connectionErrors[String(candidateId)]) return 'failed'
  const relationship = state.connections.find(
    (connection) =>
      (String(connection.requesterId) === String(currentUser.userId) && String(connection.receiverId) === String(candidateId)) ||
      (String(connection.receiverId) === String(currentUser.userId) && String(connection.requesterId) === String(candidateId)),
  )
  if (!relationship) return 'none'
  if (relationship.status === 'blocked') return 'blocked'
  if (relationship.status === 'accepted') return 'accepted'
  if (relationship.status === 'rejected') return 'rejected'
  return String(relationship.requesterId) === String(currentUser.userId) ? 'outgoing' : 'incoming'
}

function esc(value = '') {
  return String(value).replace(
    /[&<>"']/g,
    (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[char],
  )
}

function getMatches() {
  const blockedUserIds = state.connections
    .filter((connection) => connection.status === 'blocked')
    .flatMap((connection) => {
      if (String(connection.requesterId) === String(currentUser.userId)) return [connection.receiverId]
      if (String(connection.receiverId) === String(currentUser.userId)) return [connection.requesterId]
      return []
    })
  const eligibleProfiles = state.profiles.filter(isVisibleInDiscovery)
  const ranked = generateMatches(currentUser, eligibleProfiles, { excludeUserIds: blockedUserIds })
  const query = state.query.trim().toLowerCase()

  return ranked.filter((match) => {
    const profile = state.profiles.find(
      (item) => String(item.userId) === String(match.userId),
    )
    const searchText = [
      profile.name,
      profile.bio,
      ...profile.skills.map((skill) => skill.name),
    ]
      .join(' ')
      .toLowerCase()

    if (query && !searchText.includes(query)) return false
    if (state.direction === 'teach' && !match.skillsTheyCanTeach.length) return false
    if (state.direction === 'learn' && !match.skillsYouCanTeach.length) return false

    if (state.verifiedOnly) {
      const verifiedMatchedSkill = profile.skills.some(
        (skill) =>
          skill.type === 'teach' &&
          skill.verified &&
          match.skillsTheyCanTeach.includes(skill.name),
      )
      if (!verifiedMatchedSkill) return false
    }

    return true
  })
}

function connectionButton(profile) {
  const status = getConnectionStatus(profile.userId)
  const labels = {
    none: ['Connect', false],
    outgoing: ['Request Sent', true],
    incoming: ['Accept Request', false],
    accepted: ['Connected', true],
    rejected: ['Request Declined', true],
    sending: ['Sending…', true],
    failed: ['Retry', false],
    busy: ['Connect', true],
    blocked: ['Unavailable', true],
  }
  const currentAction = labels[status] ?? labels.none
  const [label, disabled] = state.sendingUserId && status !== 'sending'
    ? labels.busy
    : currentAction
  const acceptClass = status === 'incoming' ? 'accept' : ''

  return `<button class="connect-button ${acceptClass}" data-connect="${esc(profile.userId)}" ${disabled ? 'disabled' : ''}>${label}</button>`
}

function render() {
  if (state.status === 'loading') {
    notice.innerHTML = '<p class="state-message">Finding your skill-exchange partners…</p>'
    results.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>'
    return
  }

  if (state.error) {
    notice.innerHTML = `
      <div class="state-message error-message">
        We couldn’t load your matches. Please try again.
        <button id="retry" class="text-button">Retry</button>
      </div>
    `
    results.innerHTML = ''
    document.querySelector('#retry').addEventListener('click', loadProfiles)
    return
  }

  const matches = getMatches()
  notice.innerHTML = ''

  if (!matches.length) {
    results.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">⌕</span>
        <h2>No matching skill partners found yet.</h2>
        <p>Try another skill, complete your profile, or clear the filters.</p>
        <button id="clear-filters" class="secondary-button">Clear filters</button>
      </div>
    `
    document.querySelector('#clear-filters').addEventListener('click', () => {
      state.query = ''
      state.direction = 'all'
      state.verifiedOnly = false
      search.value = ''
      direction.value = 'all'
      verified.checked = false
      render()
    })
    return
  }

  results.innerHTML = matches
    .map((match) => {
      const profile = state.profiles.find(
        (item) => String(item.userId) === String(match.userId),
      )
      const teaches = skillList(profile, 'teach')
      const learns = skillList(profile, 'learn')
      const matchedTeachingNames = new Set(match.skillsTheyCanTeach)
      const badges = teaches
        .filter((skill) => skill.verified && matchedTeachingNames.has(skill.name))
        .map(
          (skill) =>
            `<span class="verified-badge" title="Verified skill">✓ ${esc(skill.name)}</span>`,
        )
        .join('')
      const exchange =
        match.matchType === 'reciprocal'
          ? `You can teach ${esc(profile.name.split(' ')[0])} ${esc(match.skillsYouCanTeach.join(', '))}, while they can teach you ${esc(match.skillsTheyCanTeach.join(', '))}.`
          : match.skillsTheyCanTeach.length
            ? `They can teach you ${esc(match.skillsTheyCanTeach.join(', '))}.`
            : `You can teach them ${esc(match.skillsYouCanTeach.join(', '))}.`
      const level = teaches.map((skill) => skill.proficiency).filter(Boolean)
      const initials = profile.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
      const matchLabel =
        match.matchType === 'reciprocal' ? '↔ Reciprocal match' : '→ Skill match'
      const rating = getRatingSummary(profile.userId)
      const outcomesBySkill = match.skillsTheyCanTeachDetails
        .map((skill) => ({
          skill: skill.name,
          outcomes: skill.learningOutcomes.slice(0, 2),
        }))
      const teachingSkills =
        teaches
          .map(
            (skill) =>
              `<span class="skill-chip">${esc(skill.name)}${skill.proficiency ? `<small>${esc(skill.proficiency)}</small>` : ''}</span>`,
          )
          .join('') || '<span class="muted">Not listed</span>'
      const learningSkills =
        learns
          .map(
            (skill) =>
              `<span class="skill-chip learn-chip">${esc(skill.name)}${skill.proficiency ? `<small>Current: ${esc(skill.proficiency)}</small>` : ''}</span>`,
          )
          .join('') || '<span class="muted">Not listed</span>'

      return `
        <article class="match-card">
          <div class="card-top">
            <div class="person-avatar">${esc(initials)}</div>
            <div class="person-info">
              <h2>${esc(profile.name)}</h2>
              <span class="match-kind">${matchLabel}</span>
            </div>
            <span class="score-pill" title="Provisional compatibility score">
              ${match.score}<small>%</small>
            </span>
          </div>
          <p class="bio">${esc(profile.bio || '')}</p>
          ${rating ? `<p class="teacher-rating" aria-label="Teacher rating">★ ${rating.average} <span>(${rating.count} ${rating.count === 1 ? 'review' : 'reviews'})</span></p>` : ''}
          <div class="skill-row">
            <h3>Can teach</h3>
            <div class="chips">${teachingSkills}</div>
          </div>
          <div class="skill-row">
            <h3>Wants to learn</h3>
            <div class="chips">${learningSkills}</div>
          </div>
          ${badges ? `<div class="verified-list">${badges}</div>` : ''}
          ${level.length ? '<p class="level-note">Teaching levels are shown on each skill.</p>' : ''}
          ${outcomesBySkill.length ? `<div class="outcome-preview"><h3>What you could learn</h3>${outcomesBySkill.map(({ skill, outcomes }) => `<section class="outcome-skill"><h4>${esc(skill)}</h4>${outcomes.length ? `<ul>${outcomes.map((outcome) => `<li>${esc(outcome)}</li>`).join('')}</ul>` : '<p class="muted">No outcomes added yet.</p>'}</section>`).join('')}</div>` : ''}
          <p class="match-reason">${exchange}</p>
          <footer class="card-actions">
            ${connectionButton(profile)}
            <button class="view-button" data-profile="${esc(profile.userId)}">View profile</button>
          </footer>
          ${state.connectionErrors[String(profile.userId)] ? `<p class="connection-error error-message" role="alert">${esc(state.connectionErrors[String(profile.userId)])}</p>` : ''}
        </article>
      `
    })
    .join('')

  results
    .querySelectorAll('[data-connect]')
    .forEach((button) =>
      button.addEventListener('click', () => updateConnection(button.dataset.connect)),
    )
  results
    .querySelectorAll('[data-profile]')
    .forEach((button) =>
      button.addEventListener('click', () => showProfile(button.dataset.profile)),
    )
}

async function updateConnection(id) {
  const profile = state.profiles.find((item) => String(item.userId) === String(id))
  if (!profile || state.sendingUserId) return
  const candidateId = getUserId(profile)
  const currentStatus = getConnectionStatus(candidateId)
  if (!['none', 'incoming', 'failed'].includes(currentStatus)) return
  const incoming = state.connections.find(
    (connection) =>
      String(connection.requesterId) === String(candidateId) &&
      String(connection.receiverId) === String(currentUser.userId) &&
      connection.status === 'pending',
  )
  state.sendingUserId = candidateId
  delete state.connectionErrors[String(candidateId)]
  render()

  // Mock mutation. Replace this promise with the agreed Convex mutation;
  // the backend must reject duplicates and authorize accept/send operations.
  try {
    await new Promise((resolve, reject) => {
      window.setTimeout(() => {
        try {
          const now = Date.now()
          if (incoming) {
            incoming.status = 'accepted'
            incoming.updatedAt = now
          } else {
            state.connections.push({
              _id: `mock_connection_${candidateId}_${now}`,
              requesterId: currentUser.userId,
              receiverId: candidateId,
              status: 'pending',
              createdAt: now,
              updatedAt: now,
            })
          }
          resolve()
        } catch (error) {
          reject(error)
        }
      }, 350)
    })
  } catch {
    state.connectionErrors[String(candidateId)] = 'Could not complete the request. Please try again.'
  } finally {
    state.sendingUserId = null
    render()
  }
}

function showProfile(id) {
  const profile = state.profiles.find((item) => String(item.userId) === String(id))
  if (!profile) return

  const teachingSkills =
    skillList(profile, 'teach')
      .map(
        (skill) =>
          `${esc(skill.name)}${skill.verified ? ' · Verified' : ''}`,
      )
      .join(', ') || 'Not listed'
  const learningSkills =
    skillList(profile, 'learn')
      .map((skill) => {
        const outcomes = skill.learningOutcomes.length
          ? `<ul class="outcome-list learning-goal-outcomes">${skill.learningOutcomes.map((outcome) => `<li>${esc(outcome)}</li>`).join('')}</ul>`
          : ''
        return `<div class="profile-skill"><p>${esc(skill.name)}${skill.proficiency ? ` · Current: ${esc(skill.proficiency)}` : ''}</p>${outcomes}</div>`
      })
      .join('') || 'Not listed'
  const rating = getRatingSummary(profile.userId)
  const teachingOutcomes = skillList(profile, 'teach')
    .filter((skill) => skill.learningOutcomes.length > 0)
    .map((skill) => `<li><strong>${esc(skill.name)}:</strong> ${skill.learningOutcomes.map(esc).join('; ')}</li>`)
    .join('')

  document.querySelector('#profile-details').innerHTML = `
    <p class="eyebrow">SKILL BARTER PROFILE</p>
    <h2>${esc(profile.name)}</h2>
    <p>${esc(profile.bio || 'No bio added yet.')}</p>
    ${rating ? `<p class="teacher-rating">★ ${rating.average} <span>from ${rating.count} ${rating.count === 1 ? 'review' : 'reviews'}</span></p>` : '<p class="teacher-rating">No reviews yet</p>'}
    <p class="profile-meta">${esc(profile.preferredLanguage || 'Language not listed')} · ${esc(profile.availability || 'Availability not listed')}</p>
    <h3>Can teach</h3>
    <p>${teachingSkills}</p>
    ${teachingOutcomes ? `<h3>Learning outcomes</h3><ul class="outcome-list">${teachingOutcomes}</ul>` : ''}
    <h3>Wants to learn</h3>
    <div>${learningSkills}</div>
  `
  document.querySelector('#profile-dialog').showModal()
}

document
  .querySelector('.dialog-close')
  .addEventListener('click', () => document.querySelector('#profile-dialog').close())
search.addEventListener('input', () => {
  state.query = search.value
  render()
})
direction.addEventListener('change', () => {
  state.direction = direction.value
  render()
})
verified.addEventListener('change', () => {
  state.verifiedOnly = verified.checked
  render()
})

function loadProfiles() {
  state.status = 'loading'
  state.error = false
  render()
  window.setTimeout(() => {
    state.status = 'success'
    render()
  }, 300)
}

loadProfiles()
