export const SALES_CHECK_STORAGE_KEY = 'sls-sales-check-progress-v1';

// Replay the saved route against today's questions rather than trusting stored IDs.
export function normalizeSalesCheckState(questions, state) {
  if (!state || state.version !== 1 || !Array.isArray(state.history) ||
      state.history.length > Object.keys(questions).length ||
      !state.answers || typeof state.answers !== 'object' || Array.isArray(state.answers)) return null;
  let current = 'start';
  const answers = {};
  const validAnswer = (q, value) => typeof value === 'string' && q.options.some(option => option[0] === value);
  for (const id of state.history) {
    if (id !== current || !Object.hasOwn(questions, id)) return null;
    const q = questions[id], value = state.answers[id];
    if (q.summary || !validAnswer(q, value)) return null;
    answers[id] = value;
    current = typeof q.next === 'function' ? q.next(answers, value) : q.next;
  }
  if (state.current !== current || !Object.hasOwn(questions, current)) return null;
  if (Object.hasOwn(state.answers, current)) {
    if (!validAnswer(questions[current], state.answers[current])) return null;
    answers[current] = state.answers[current];
  }
  return {version: 1, current, history: [...state.history], answers};
}

export function readSavedSalesCheck(storage, questions) {
  const raw = storage.getItem(SALES_CHECK_STORAGE_KEY);
  if (!raw) return null;
  let state;
  try { state = JSON.parse(raw); } catch { return null; }
  return normalizeSalesCheckState(questions, state);
}

export function writeSavedSalesCheck(storage, questions, state) {
  const clean = normalizeSalesCheckState(questions, {...state, version: 1});
  if (!clean) throw new Error('Invalid sales check state');
  storage.setItem(SALES_CHECK_STORAGE_KEY, JSON.stringify(clean));
}
