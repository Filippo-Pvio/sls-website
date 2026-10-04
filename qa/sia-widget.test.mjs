import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const code = await readFile(new URL('../assets/sia-widget.js', import.meta.url), 'utf8');

async function fixture(withViewport = true, mobile = true) {
  function element() {
    const listeners = new Map(), properties = new Map(), priorities = new Map(), attributes = new Map();
    return {
      listeners, properties, attributes, classList: { add() {} }, focusCalls: [], value: '', scrollTop: 0,
      addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
      removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
      emit(type) { listeners.get(type)?.forEach(fn => fn()); },
      setAttribute(name, value) { attributes.set(name, value); },
      removeAttribute(name) { attributes.delete(name); },
      toggleAttribute(name, enabled) { if (enabled) attributes.set(name, ''); else attributes.delete(name); },
      replaceChildren() {},
      focus(options) { this.focusCalls.push(options); },
      style: {
        setProperty(name, value, priority = '') { properties.set(name, value); priorities.set(name, priority); },
        getPropertyValue(name) { return properties.get(name) ?? ''; },
        getPropertyPriority(name) { return priorities.get(name) ?? ''; },
        removeProperty(name) { properties.delete(name); priorities.delete(name); },
      },
      showModal() { this.open = true; },
      close() { this.open = false; this.emit('close'); },
    };
  }
  const nodes = new Map(), suggestions = [element(), element(), element(), element()];
  const get = selector => { if (!nodes.has(selector)) nodes.set(selector, element()); return nodes.get(selector); };
  const root = { innerHTML: '', querySelector: get, querySelectorAll: () => suggestions };
  const frames = new Map(), scrollCalls = []; let id = 0;
  const body = Object.assign(element(), { append() {} });
  const viewport = Object.assign(element(), { height: 780, offsetTop: 0 });
  const window = Object.assign(element(), {
    innerHeight: 780, scrollX: 0, scrollY: 1250,
    setTimeout: () => 1, clearTimeout() {},
    matchMedia: () => ({ matches: mobile }),
    scrollTo(options) { scrollCalls.push(options); },
    visualViewport: withViewport ? viewport : undefined,
    requestAnimationFrame(fn) { frames.set(++id, fn); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
  });
  await runInNewContext(code, {
    window,
    document: { querySelector: () => null, createElement: () => ({ attachShadow: () => root }), body },
    fetch: async url => ({ ok: true, json: async () => url === '/api/sia-config' ? { enabled: true } : { provider: 'OpenAI', answer: 'Antwort', sources: [] } }),
    AbortController, setTimeout, clearTimeout,
  });
  return { get, root, body, scrollCalls, suggestions, viewport, window, frames, flush() { for (const [key, fn] of frames) { frames.delete(key); fn(); } } };
}

test('opening SIA never focuses the input; closing restores the launcher without scrolling', async () => {
  const f = await fixture();
  f.get('.launch').emit('click');
  assert.equal(f.get('dialog').open, true);
  assert.equal(f.get('textarea').focusCalls.length, 0);
  assert.equal(f.get('.close').focusCalls.at(-1).preventScroll, true);
  // The native dialog must also start on a non-input element, before the click handler continues.
  assert.match(f.root.innerHTML, /<button class="close"[^>]*autofocus/);
  f.get('.close').emit('click');
  assert.equal(f.get('dialog').open, false);
  assert.equal(f.get('.launch').attributes.get('aria-expanded'), 'false');
  assert.equal(f.get('.launch').focusCalls.at(-1).preventScroll, true);
});

test('keyboard opening, viewport panning and keyboard dismissal resize the dialog without scrolling its header', async () => {
  const f = await fixture(), dialog = f.get('dialog');
  f.get('.launch').emit('click');
  assert.equal(dialog.properties.get('--sia-viewport-height'), '780px');
  f.viewport.height = 410; f.viewport.offsetTop = 160; dialog.scrollTop = 100;
  f.viewport.emit('resize'); f.viewport.emit('scroll');
  assert.equal(f.frames.size, 1);
  f.flush();
  assert.equal(dialog.properties.get('--sia-viewport-height'), '410px');
  assert.equal(dialog.properties.get('--sia-viewport-top'), '160px');
  assert.equal(dialog.scrollTop, 0);
  f.viewport.height = 780; f.viewport.offsetTop = 0;
  dialog.emit('focusout'); f.viewport.emit('resize'); f.flush();
  assert.equal(dialog.properties.get('--sia-viewport-height'), '780px');
  assert.equal(dialog.properties.get('--sia-viewport-top'), '0px');
  f.viewport.emit('resize'); dialog.close();
  assert.equal(f.frames.size, 0);
  f.viewport.emit('resize'); f.window.emit('resize');
  assert.equal(f.frames.size, 0);
  f.get('.launch').emit('click');
  assert.equal(f.viewport.listeners.get('resize').size, 1);
});

test('viewport fallback supports resizing and suggestions still allow intentional text entry', async () => {
  const f = await fixture(false);
  f.get('.launch').emit('click');
  f.window.innerHeight = 430; f.window.emit('resize'); f.flush();
  assert.equal(f.get('dialog').properties.get('--sia-viewport-height'), '430px');
  assert.equal(f.get('dialog').properties.get('--sia-viewport-top'), '0px');
  f.suggestions[0].emit('click');
  assert.match(f.get('textarea').value, /Verkauf/);
  assert.equal(f.get('textarea').focusCalls.length, 1);
  assert.equal(f.get('textarea').focusCalls[0].preventScroll, true);
});


test('mobile dialog locks the background at its current scroll position and restores existing styles on close', async () => {
  const f = await fixture();
  f.body.style.setProperty('overflow', 'clip', 'important');
  f.body.style.setProperty('color', 'red');
  f.get('.launch').emit('click');
  assert.equal(f.body.properties.get('position'), 'fixed');
  assert.equal(f.body.properties.get('top'), '-1250px');
  f.root.activeElement = f.get('textarea');
  f.viewport.height = 360;
  f.get('dialog').emit('focusin'); f.viewport.emit('resize'); f.flush();
  assert.equal(f.get('dialog').attributes.has('data-keyboard-open'), true);
  assert.equal(f.get('dialog').attributes.has('data-compact'), true);
  assert.equal(f.body.properties.get('top'), '-1250px');
  f.get('dialog').close();
  assert.equal(f.body.properties.has('position'), false);
  assert.equal(f.body.properties.has('top'), false);
  assert.equal(f.body.properties.get('overflow'), 'clip');
  assert.equal(f.body.style.getPropertyPriority('overflow'), 'important');
  assert.equal(f.body.properties.get('color'), 'red');
  assert.equal(f.scrollCalls.at(-1).top, 1250);
  assert.equal(f.scrollCalls.at(-1).behavior, 'instant');
  f.root.activeElement = null; f.viewport.height = 780;
  f.get('.launch').emit('click');
  assert.equal(f.get('dialog').attributes.has('data-keyboard-open'), false);
  assert.equal(f.get('dialog').attributes.has('data-compact'), false);
});

test('desktop dialog does not change the page scroll position or body styles', async () => {
  const f = await fixture(true, false);
  f.get('.launch').emit('click');
  assert.equal(f.body.properties.size, 0);
  f.get('dialog').close();
  assert.equal(f.scrollCalls.length, 0);
});


test('an arriving answer keeps keyboard focus and a follow-up draft intact', async () => {
  const f = await fixture();
  f.get('.launch').emit('click');
  f.get('textarea').value = 'Was kostet der Verkauf?';
  const submit = [...f.get('form').listeners.get('submit')][0];
  const response = submit({ preventDefault() {} });
  f.root.activeElement = f.get('textarea');
  f.get('textarea').value = 'Und welche Unterlagen brauche ich?';
  await response;
  assert.equal(f.get('.answer').textContent, 'Antwort');
  assert.equal(f.get('.result').focusCalls.length, 0);
  assert.equal(f.get('textarea').value, 'Und welche Unterlagen brauche ich?');
});

test('information view preserves the draft and answer scroll, then restores focus without opening the keyboard', async () => {
  const f = await fixture();
  f.get('.launch').emit('click');
  f.get('textarea').value = 'Meine noch nicht abgesendete Frage';
  f.get('.content').scrollTop = 180;
  f.get('.notes-open').emit('click');
  assert.equal(f.get('.notes').hidden, false);
  assert.equal(f.get('.content').hidden, true);
  assert.equal(f.get('form').hidden, true);
  assert.equal(f.get('.notes-open').attributes.get('aria-expanded'), 'true');
  assert.equal(f.get('#sia-notes-title').focusCalls.at(-1).preventScroll, true);
  f.get('.notes-back').emit('click');
  assert.equal(f.get('textarea').value, 'Meine noch nicht abgesendete Frage');
  assert.equal(f.get('.content').scrollTop, 180);
  assert.equal(f.get('.content').hidden, false);
  assert.equal(f.get('form').hidden, false);
  assert.equal(f.get('.notes').hidden, true);
  assert.equal(f.get('.notes-open').focusCalls.at(-1).preventScroll, true);
  assert.equal(f.get('textarea').focusCalls.length, 0);
  f.get('.notes-open').emit('click');
  f.get('.close').emit('click');
  f.get('.launch').emit('click');
  assert.equal(f.get('.notes').hidden, true);
  assert.equal(f.get('textarea').value, 'Meine noch nicht abgesendete Frage');
});

test('all four topic actions prepare distinct questions without sending a request', async () => {
  const f = await fixture();
  const drafts = [];
  for (const button of f.suggestions) { button.emit('click'); drafts.push(f.get('textarea').value); }
  assert.equal(new Set(drafts).size, 4);
  assert.match(drafts[1], /Wert/);
  assert.match(drafts[2], /Immobilienkauf/);
  assert.match(drafts[3], /Finanzierung/);
  assert.equal(f.get('.send').disabled, undefined);
});
