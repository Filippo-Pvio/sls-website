import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {getSalesCheckProgress, getSalesCheckSection} from '../assets/verkaufscheck-progress.js';

// Exercise the real question graph, so changes to routing are covered too.
const code = await readFile(new URL('../assets/verkaufscheck.js', import.meta.url), 'utf8');
const graph = code.slice(code.indexOf('  const statusOptions'), code.indexOf('  const todoDefinitions'));
const questions = runInNewContext(graph + '\nquestions;');
const progress = state => getSalesCheckProgress(questions, state);
const advance = state => {
  const question = questions[state.current], value = state.answers[state.current];
  const next = typeof question.next === 'function' ? question.next(state.answers, value) : question.next;
  return {...state, history: [...state.history, state.current], current: next};
};

for (const start of ['noBuyer', 'interest', 'buyer', 'unsure']) {
  for (const type of ['house', 'apartment', 'investment', 'land']) {
    for (const strategy of ['first', 'last', 'alternating']) {
      test(`${start}/${type}/${strategy}: monotonic, below 100 until the result`, () => {
        let state = {current: 'start', history: [], answers: {}};
        let previous = 0;
        assert.equal(progress(state), 0);
        const snapshots = [];
        while (!questions[state.current].summary) {
          const before = progress(state);
          assert(before >= previous && before < 100);
          const choices = questions[state.current].options;
          const value = state.current === 'start' ? start : state.current.startsWith('type') ? type
            : choices[strategy === 'last' || strategy === 'alternating' && state.history.length % 2 ? choices.length - 1 : 0][0];
          state.answers[state.current] = value;
          const after = progress(state);
          assert(after >= before && after < 100);
          snapshots.push({current: state.current, history: [...state.history], answers: {...state.answers}, percent: after});
          previous = after;
          state = advance(state);
          assert(state.history.length < 50, 'route must terminate');
        }
        assert.equal(progress(state), 100);
        assert.equal(getSalesCheckSection(state.current), 'Ergebnis');
        // Going back must reflect the earlier position, even with later answers retained.
        for (const snapshot of snapshots) {
          assert.equal(progress({...snapshot, answers: state.answers}), snapshot.percent);
        }
      });
    }
  }
}

test('the longest buyer flow still has questions left at step 13', () => {
  let state = {current: 'start', history: [], answers: {}};
  while (state.history.length < 12) {
    const value = state.current === 'start' ? 'buyer' : state.current.startsWith('type') ? 'investment'
      : state.current === 'ownership' ? 'multiple' : state.current === 'occupancy' ? 'rented'
      : questions[state.current].options[0][0];
    state.answers[state.current] = value;
    state = advance(state);
  }
  assert(!questions[state.current].summary);
  assert(progress(state) > 0 && progress(state) < 100);
});

test('changing the starting branch ignores saved answers from the abandoned route', () => {
  const fresh = {current: 'typeBuyer', history: ['start'], answers: {start: 'buyer', typeBuyer: 'land'}};
  const stale = {...fresh, answers: {...fresh.answers, typePrep: 'house', typeInterest: 'investment', docEnergy: 'yes', finance: 'yes'}};
  assert.equal(progress(stale), progress(fresh));
  assert.equal(progress({...stale, current: 'start', history: []}), 0);
});
