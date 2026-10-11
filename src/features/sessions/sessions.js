const STORAGE_KEY = 'skillbarter_session_completion_demo_v1'
const transferKey = (id) => 'session:' + id + ':transfer'
const releaseKey = (id) => 'session:' + id + ':release'

function initialState() {
  return {
    viewerRole: 'learner',
    accounts: {
      alice: { name: 'Alice', role: 'Teacher', available: 20, reserved: 0 },
      bob: { name: 'Bob', role: 'Learner', available: 40, reserved: 10 },
    },
    sessions: [{
      id: 'javascript-basics-60m', title: 'JavaScript Basics',
      teacherId: 'alice', learnerId: 'bob', durationMinutes: 60, creditAmount: 10,
      status: 'awaiting_confirmation', teacherConfirmedAt: null, learnerConfirmedAt: null,
      disputeReason: '', createdAt: Date.now(),
    }],
    ledger: [],
  }
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (saved?.accounts && Array.isArray(saved.sessions) && Array.isArray(saved.ledger)) return saved
  } catch (error) {
    console.warn('Unable to load session demo.', error)
  }
  return initialState()
}

let state = loadState()
let disputeFormSessionId = null
const $ = (selector) => document.querySelector(selector)

function el(tag, className, text) {
  const result = document.createElement(tag)
  if (className) result.className = className
  if (text !== undefined) result.textContent = text
  return result
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('Unable to save session demo.', error)
    window.alert('The browser could not save this demo state.')
  }
}

function dateText(timestamp) {
  return timestamp ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp) : ''
}

function button(parent, text, action, cssClass) {
  const item = el('button', cssClass, text)
  item.type = 'button'
  item.dataset.action = action
  parent.append(item)
}

function renderBalances() {
  const container = $('#balanceCards')
  container.replaceChildren()
  for (const account of Object.values(state.accounts)) {
    const card = el('article', 'balance-card')
    const top = el('div', 'balance-top')
    top.append(el('strong', '', account.name + ' · ' + account.role))
    top.append(el('b', '', (account.available + account.reserved) + ' credits total'))
    card.append(top, el('p', '', account.available + ' available · ' + account.reserved + ' held'))
    container.append(card)
  }
}

function renderSession(session, adminCopy = false) {
  const card = el('article', 'session-card')
  card.dataset.sessionId = session.id
  const header = el('div', 'session-header')
  const title = el('div')
  title.append(el('h3', '', session.title))
  title.append(el('p', 'muted', session.durationMinutes + ' minutes · ' + session.creditAmount + ' credits'))
  let label = 'Waiting for both confirmations'
  if (session.status === 'completed') label = 'Completed'
  if (session.status === 'disputed') label = 'Under admin review'
  if (session.status === 'cancelled') label = 'Cancelled'
  if (session.status === 'awaiting_confirmation' && (session.teacherConfirmedAt || session.learnerConfirmedAt)) label = 'Waiting for the other confirmation'
  header.append(title, el('span', 'badge badge-' + session.status, label))
  card.append(header, el('p', 'muted', 'SkillBarter records confirmations; it does not verify attendance in the meeting app.'))

  const confirmations = el('div', 'confirmations')
  for (const [person, timestamp] of [['Alice · teacher', session.teacherConfirmedAt], ['Bob · learner', session.learnerConfirmedAt]]) {
    const line = el('div', 'confirmation')
    line.append(el('span', timestamp ? 'check is-done' : 'check', timestamp ? '✓' : '…'))
    const details = el('span')
    details.append(el('strong', '', person), el('small', '', timestamp ? 'Confirmed ' + dateText(timestamp) : 'Confirmation pending'))
    line.append(details)
    confirmations.append(line)
  }
  card.append(confirmations)

  if (session.status === 'disputed' && session.disputeReason) {
    const reason = el('p', 'dispute-reason')
    reason.append(el('strong', '', 'Reported disagreement: '), document.createTextNode(session.disputeReason))
    card.append(reason)
  }

  if (session.status === 'awaiting_confirmation' && !adminCopy) {
    const actions = el('div', 'actions')
    const currentStamp = state.viewerRole === 'teacher' ? session.teacherConfirmedAt : session.learnerConfirmedAt
    if (state.viewerRole !== 'admin' && !currentStamp) {
      button(actions, 'Confirm session completed', 'confirm-' + state.viewerRole, 'button primary')
      button(actions, 'Report a disagreement', 'show-dispute', 'button outline')
    } else if (state.viewerRole === 'admin') {
      actions.append(el('p', 'muted', 'Switch to Alice or Bob to submit a confirmation.'))
    } else {
      actions.append(el('p', 'success-note', 'Your confirmation is recorded. Credits are still held.'))
    }

    if (disputeFormSessionId === session.id) {
      const form = document.createElement('form')
      form.className = 'dispute-form'
      form.dataset.sessionId = session.id
      const labelEl = el('label', '', 'What do you disagree about?')
      const input = document.createElement('textarea')
      input.name = 'reason'
      input.required = true
      input.maxLength = 500
      input.rows = 3
      input.placeholder = 'Explain what did not happen as expected.'
      labelEl.append(input)
      const formActions = el('div', 'actions')
      const send = el('button', 'button danger', 'Send to admin review')
      send.type = 'submit'
      const cancel = el('button', 'button quiet', 'Cancel')
      cancel.type = 'button'
      cancel.dataset.action = 'cancel-dispute'
      formActions.append(send, cancel)
      form.append(labelEl, formActions)
      actions.append(form)
    }
    card.append(actions)
  }

  if (session.status === 'disputed') card.append(el('p', 'muted', 'The 10-credit hold stays in place until admin resolves this dispute.'))
  if (session.status === 'completed') card.append(el('p', 'success-note', 'The transfer was recorded once.'))
  if (session.status === 'cancelled') card.append(el('p', 'muted', 'Reserved credits were released to Bob.'))
  return card
}

function renderDisputes() {
  const section = $('#adminReview')
  section.hidden = state.viewerRole !== 'admin'
  const list = $('#disputeList')
  list.replaceChildren()
  if (state.viewerRole !== 'admin') return
  const disputes = state.sessions.filter((item) => item.status === 'disputed')
  if (!disputes.length) {
    list.append(el('p', 'empty', 'No session disputes need review.'))
    return
  }
  for (const session of disputes) {
    const card = renderSession(session, true)
    const actions = el('div', 'actions')
    button(actions, 'Resolve: complete and transfer credits', 'resolve-complete', 'button primary')
    button(actions, 'Resolve: cancel and release hold', 'resolve-cancel', 'button outline')
    card.append(actions)
    list.append(card)
  }
}

function renderLedger() {
  const list = $('#ledgerList')
  list.replaceChildren()
  if (!state.ledger.length) {
    list.append(el('p', 'empty', 'No credit transfer has happened yet.'))
    return
  }
  for (const entry of [...state.ledger].reverse()) {
    const row = el('article', 'ledger-row')
    row.append(el('span', '', entry.type === 'transfer'
      ? entry.fromName + ' paid ' + entry.toName
      : 'Reserved credits returned to ' + entry.toName))
    row.append(el('strong', '', '+' + entry.amount + ' credits'))
    row.append(el('small', '', dateText(entry.createdAt)))
    list.append(row)
  }
}

function render() {
  $('#viewerRole').value = state.viewerRole
  renderBalances()
  const sessions = $('#sessionList')
  sessions.replaceChildren()
  for (const session of state.sessions) sessions.append(renderSession(session))
  renderDisputes()
  renderLedger()
}

function complete(session, byAdmin) {
  const idempotencyKey = transferKey(session.id)
  if (!state.ledger.some((entry) => entry.id === idempotencyKey)) {
    const learner = state.accounts[session.learnerId]
    const teacher = state.accounts[session.teacherId]
    if (!learner || !teacher || learner.reserved < session.creditAmount) {
      session.status = 'disputed'
      session.disputeReason = 'The reserved credits are unavailable. Admin review is required.'
      return
    }
    learner.reserved -= session.creditAmount
    teacher.available += session.creditAmount
    state.ledger.push({
      id: idempotencyKey, type: 'transfer', fromName: learner.name, toName: teacher.name,
      amount: session.creditAmount, sessionId: session.id, createdAt: Date.now(), resolvedByAdmin: Boolean(byAdmin),
    })
  }
  session.status = 'completed'
  session.completedAt = Date.now()
}

function releaseHold(session) {
  const key = releaseKey(session.id)
  if (!state.ledger.some((entry) => entry.id === key)) {
    const learner = state.accounts[session.learnerId]
    const released = Math.min(learner.reserved, session.creditAmount)
    learner.reserved -= released
    learner.available += released
    state.ledger.push({
      id: key, type: 'release', fromName: 'Reserved credits', toName: learner.name,
      amount: released, sessionId: session.id, createdAt: Date.now(),
    })
  }
  session.status = 'cancelled'
}

function action(actionName, session) {
  if (!session) return
  if (actionName === 'confirm-teacher' || actionName === 'confirm-learner') {
    if (session.status !== 'awaiting_confirmation') return
    const field = actionName === 'confirm-teacher' ? 'teacherConfirmedAt' : 'learnerConfirmedAt'
    if (session[field]) return
    session[field] = Date.now()
    if (session.teacherConfirmedAt && session.learnerConfirmedAt) complete(session, false)
  } else if (actionName === 'show-dispute') {
    disputeFormSessionId = session.id
  } else if (actionName === 'cancel-dispute') {
    disputeFormSessionId = null
  } else if (actionName === 'resolve-complete' && state.viewerRole === 'admin' && session.status === 'disputed') {
    complete(session, true)
  } else if (actionName === 'resolve-cancel' && state.viewerRole === 'admin' && session.status === 'disputed') {
    releaseHold(session)
  } else {
    return
  }
  save()
  render()
  if (actionName === 'show-dispute') document.querySelector('.dispute-form textarea')?.focus()
}

$('#viewerRole').addEventListener('change', (event) => {
  state.viewerRole = event.target.value
  save()
  render()
})

$('#resetDemo').addEventListener('click', () => {
  state = initialState()
  disputeFormSessionId = null
  save()
  render()
})

document.addEventListener('click', (event) => {
  const control = event.target.closest('button[data-action]')
  if (!control) return
  const card = control.closest('.session-card')
  action(control.dataset.action, state.sessions.find((item) => item.id === card?.dataset.sessionId))
})

document.addEventListener('submit', (event) => {
  const form = event.target.closest('form[data-session-id]')
  if (!form) return
  event.preventDefault()
  const session = state.sessions.find((item) => item.id === form.dataset.sessionId)
  const reason = new FormData(form).get('reason')?.toString().trim()
  if (!session || !reason || state.viewerRole === 'admin') return
  session.status = 'disputed'
  session.disputeReason = reason
  session.disputedAt = Date.now()
  disputeFormSessionId = null
  save()
  render()
})

render()
