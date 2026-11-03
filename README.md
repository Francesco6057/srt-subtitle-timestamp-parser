# srt-subtitle-timestamp-parser

Parses and validates SRT subtitle files into structured cue objects with start and end times.

```js
import { parseSrt, parseTimestamp, formatTimestamp } from 'srt-subtitle-timestamp-parser';

const cues = parseSrt(`1
00:00:01,000 --> 00:00:02,000
Hello

2
00:00:03,000 --> 00:00:04,000
World
`);

console.log(cues);
// [
//   { index: 1, start: 1000, end: 2000, text: 'Hello' },
//   { index: 2, start: 3000, end: 4000, text: 'World' }
// ]

console.log(parseTimestamp('00:00:01,500')); // 1500
console.log(formatTimestamp(1500)); // '00:00:01,500'
```

## Why this exists

SRT is a deceptively simple format, but real files are full of small variations:
CRLF line endings, dot instead of comma in timestamps, trailing blank lines,
and multi-line cue text. A parser that silently accepts everything makes bugs
hard to trace; a parser that rejects everything is useless. This library takes
a strict-but-fair approach: it normalizes line endings and accepts both comma
and dot millisecond separators, but it rejects cues that are structurally
invalid (missing index, missing timestamp, end before start). This trade-off
means you get clear errors for genuinely broken files while still handling the
common harmless variations.

## The awkward edge

The parser splits cues on blank lines. A cue whose text contains a blank line
will be split into two cues, and the second part will likely fail validation.
SRT does not have an escape mechanism for blank lines inside cue text, so this
is inherent to the format. If you need to preserve blank lines, you must
preprocess the input.
