import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTimestamp, formatTimestamp, parseSrt } from '../src/index.js';

test('parseTimestamp parses a valid timestamp with comma', () => {
  assert.equal(parseTimestamp('00:00:01,000'), 1000);
  assert.equal(parseTimestamp('01:02:03,004'), 3723004);
});

test('parseTimestamp parses a valid timestamp with dot', () => {
  assert.equal(parseTimestamp('00:00:01.500'), 1500);
});

test('parseTimestamp rejects invalid formats', () => {
  assert.throws(() => parseTimestamp('1:2:3,4'), /Invalid timestamp/);
  assert.throws(() => parseTimestamp('00:60:00,000'), /Invalid timestamp/);
  assert.throws(() => parseTimestamp('00:00:60,000'), /Invalid timestamp/);
  assert.throws(() => parseTimestamp('00:00:00,0000'), /Invalid timestamp/);
});

test('formatTimestamp formats milliseconds correctly', () => {
  assert.equal(formatTimestamp(0), '00:00:00,000');
  assert.equal(formatTimestamp(1000), '00:00:01,000');
  assert.equal(formatTimestamp(3723004), '01:02:03,004');
});

test('formatTimestamp rejects negative or non-integer values', () => {
  assert.throws(() => formatTimestamp(-1), /Invalid milliseconds/);
  assert.throws(() => formatTimestamp(1.5), /Invalid milliseconds/);
});

test('parseSrt parses a simple file', () => {
  const input = `1
00:00:01,000 --> 00:00:02,000
Hello

2
00:00:03,000 --> 00:00:04,000
World
`;
  const cues = parseSrt(input);
  assert.deepEqual(cues, [
    { index: 1, start: 1000, end: 2000, text: 'Hello' },
    { index: 2, start: 3000, end: 4000, text: 'World' },
  ]);
});

test('parseSrt handles multi-line cue text', () => {
  const input = `1
00:00:01,000 --> 00:00:02,000
Line one
Line two
`;
  const cues = parseSrt(input);
  assert.equal(cues.length, 1);
  assert.equal(cues[0].text, 'Line one\nLine two');
});

test('parseSrt handles CRLF line endings', () => {
  const input = '1\r\n00:00:01,000 --> 00:00:02,000\r\nHello\r\n';
  const cues = parseSrt(input);
  assert.equal(cues.length, 1);
  assert.equal(cues[0].text, 'Hello');
});

test('parseSrt returns empty array for empty input', () => {
  assert.deepEqual(parseSrt(''), []);
  assert.deepEqual(parseSrt('   \n  '), []);
});

test('parseSrt rejects malformed cues', () => {
  assert.throws(() => parseSrt('1\n00:00:01,000 --> 00:00:02,000'), /missing required lines/);
  assert.throws(() => parseSrt('abc\n00:00:01,000 --> 00:00:02,000\nHi'), /invalid index/);
  assert.throws(() => parseSrt('1\nnot a timestamp\nHi'), /invalid timestamp line/);
  assert.throws(() => parseSrt('1\n00:00:02,000 --> 00:00:01,000\nHi'), /ends before it starts/);
});

test('parseSrt handles trailing blank lines', () => {
  const input = '1\n00:00:01,000 --> 00:00:02,000\nHello\n\n';
  const cues = parseSrt(input);
  assert.equal(cues.length, 1);
  assert.equal(cues[0].text, 'Hello');
});
