/* Remaining questions follow the same routing rules as the sales check itself. */
export function getSalesCheckProgress(questions, {current, history, answers}) {
  if (questions[current].summary) return 100;

  // Answers beyond the current position may belong to an abandoned branch.
  const context = Object.fromEntries(history.map(id => [id, answers[id]]));
  if (answers[current] !== undefined) context[current] = answers[current];
  const memo = new Map();

  const remaining = (id, routeAnswers, knownValue) => {
    const question = questions[id];
    if (question.summary) return 0;
    // Only starting situation and property type affect later routing.
    const key = JSON.stringify([id, routeAnswers.start, routeAnswers.typePrep,
      routeAnswers.typeInterest, routeAnswers.typeBuyer, knownValue]);
    if (memo.has(key)) return memo.get(key);
    const choices = knownValue === undefined
      ? question.options.map(([value]) => value) : [knownValue];
    const count = 1 + Math.max(...choices.map(value => {
      const nextAnswers = {...routeAnswers, [id]: value};
      const nextId = typeof question.next === 'function'
        ? question.next(nextAnswers, value) : question.next;
      return remaining(nextId, nextAnswers);
    }));
    memo.set(key, count);
    return count;
  };

  // Reserve enough room for optional follow-up questions until answers resolve them.
  const total = history.length + remaining(current, context, context[current]);
  return Math.min(99, Math.floor(history.length / total * 100));
}

export function getSalesCheckSection(id) {
  if (id.startsWith('summary')) return 'Ergebnis';
  if (['start', 'typePrep', 'typeInterest', 'typeBuyer'].includes(id)) return 'Einstieg';
  if (id === 'market') return 'Vermarktung';
  if (['qualification', 'finance', 'financeType'].includes(id)) return 'Käufer';
  if (['notaryRisk', 'notary', 'earlyAccess', 'payment', 'handover'].includes(id)) return 'Abwicklung';
  return 'Unterlagen';
}
