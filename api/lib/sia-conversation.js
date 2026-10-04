// Conversation stays in the open widget; only these bounded turns go to the API.
export function validateHistory(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 6) throw new Error('Invalid history');
  let length = 0;
  return value.map((turn, index) => {
    if (!turn || !['user', 'assistant'].includes(turn.role) || typeof turn.content !== 'string') throw new Error('Invalid history');
    const content = turn.content.trim();
    if (!content || content.length > (turn.role === 'user' ? 1200 : 3000)) throw new Error('Invalid history');
    if (turn.role !== (index % 2 === 0 ? 'user' : 'assistant')) throw new Error('Invalid history order');
    length += content.length;
    if (length > 12600) throw new Error('History too large');
    if (turn.kind !== undefined && (turn.role !== 'assistant' || !['answer', 'clarification'].includes(turn.kind))) throw new Error('Invalid history kind');
    return { role: turn.role, content, ...(turn.kind === 'clarification' ? { kind: 'clarification' } : {}) };
  });
}
export function validateConversation(value) {
  const turns = validateHistory(value);
  if (turns.length % 2) throw new Error('Incomplete history');
  return turns;
}
