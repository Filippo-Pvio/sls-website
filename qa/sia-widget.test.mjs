import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const code = await readFile(new URL('../assets/sia-widget.js', import.meta.url), 'utf8');

async function fixture(withViewport = true) {
  function element() {
    const listeners = new Map(), properties = new Map(), attributes = new Map();
    return {
      listeners, properties, attributes, focusCalls: [], value: '', scrollTop: 0,
      addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
      removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
      emit(type) { listeners.get(type)?.forEach(fn => fn()); },
      setAttribute(name, value) { attributes.set(name, value); },
      focus(options) { this.focusCalls.push(options); },
      style: { setProperty(name, value) { properties.set(name, value); } },
      showModal() { this.open = true; },
      close() { this.open = false; this.emit('close'); },
    };
  }
  const nodes = new Map(), suggestions = [element(), element()];
  const get = selector => { if (!nodes.has(selector)) nodes.set(selector, element()); return nodes.get(selector); };
  const root = { innerHTML: '', querySelector: get, querySelectorAll: () => suggestions };
  const frames = new Map(); let id = 0;
  const viewport = Object.assign(element(), { height: 780, offsetTop: 0 });
  const window = Object.assign(element(), {
    innerHeight: 780,
    visualViewport: withViewport ? viewport : undefined,
    requestAnimationFrame(fn) { frames.set(++id, fn); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
  });
  await runInNewContext(code, {
    window,
    document: { querySelector: () => null, createElement: () => ({ attachShadow: () => root }), body: { append() {} } },
    fetch: async () => ({ ok: true, json: async () => ({ enabled: true }) }),
  });
  return { get, root, suggestions, viewport, window, frames, flush() { for (const [key, fn] of frames) { frames.delete(key); fn(); } } };
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
  assert.match(f.get('textarea').value, /Mietwohnung/);
  assert.equal(f.get('textarea').focusCalls.length, 1);
  assert.equal(f.get('textarea').focusCalls[0].preventScroll, true);
});
