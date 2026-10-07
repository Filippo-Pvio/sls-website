// Log fixed diagnostics, never exception text, stacks, URLs or provider bodies.
// JSON parsing errors in particular may quote the response being parsed.
export function logOperationalFailure(event, error, level = 'error') {
  const diagnostic = {event: /^[a-z][a-z0-9_]{0,79}$/.test(event) ? event : 'operational_failure', kind: 'operation_failed'};
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError' || error?.message === 'read_timeout') diagnostic.kind = 'timeout';
  else if (error?.name === 'SyntaxError') diagnostic.kind = 'invalid_response';
  else {
    const match = typeof error?.message === 'string' && error.message.match(/^(?:Propstack (?:HTTP |returned |(?:GET |POST |PUT )?[a-z_\/:]+ (?:returned |failed \())|read_http_)([45]\d{2})(?:\)|$)/);
    if (match) { diagnostic.kind = 'provider_rejected'; diagnostic.status = Number(match[1]); }
  }
  console[level === 'warn' ? 'warn' : 'error'](JSON.stringify(diagnostic));
}
