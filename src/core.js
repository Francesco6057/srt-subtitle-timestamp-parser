const TIMESTAMP_RE = /^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/;

/**
 * Parses a single SRT timestamp string into milliseconds.
 * SRT timestamps are formatted as `HH:MM:SS,mmm` (or `HH:MM:SS.mmm`).
 * We accept both comma and dot as the millisecond separator because some
 * writers use a dot, and rejecting them would be needlessly strict.
 *
 * @param {string} text
 * @returns {number} milliseconds since midnight
 * @throws {Error} if the string is not a valid SRT timestamp
 */
export function parseTimestamp(text) {
  const match = TIMESTAMP_RE.exec(text);
  if (!match) {
    throw new Error(`Invalid timestamp: ${JSON.stringify(text)}`);
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const millis = Number(match[4]);
  if (minutes > 59 || seconds > 59) {
    throw new Error(`Invalid timestamp: ${JSON.stringify(text)}`);
  }
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis;
}

/**
 * Formats milliseconds since midnight as an SRT timestamp string.
 *
 * @param {number} ms
 * @returns {string} formatted as `HH:MM:SS,mmm`
 */
export function formatTimestamp(ms) {
  if (!Number.isInteger(ms) || ms < 0) {
    throw new Error(`Invalid milliseconds: ${ms}`);
  }
  const millis = ms % 1000;
  const totalSeconds = (ms - millis) / 1000;
  const seconds = totalSeconds % 60;
  const totalMinutes = (totalSeconds - seconds) / 60;
  const minutes = totalMinutes % 60;
  const hours = (totalMinutes - minutes) / 60;
  const pad = (n, width) => String(n).padStart(width, '0');
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(millis, 3)}`;
}

/**
 * Parses an SRT subtitle file into an array of cue objects.
 *
 * The parser is deliberately strict about the structure of the file:
 * cues must be separated by blank lines, and every cue must have a
 * numeric index, a timestamp line, and at least one line of text.
 * This strictness is the trade-off: real-world SRT files are often
 * malformed in small ways, but silently accepting garbage makes
 * downstream bugs harder to find. If you need leniency, preprocess
 * the input before handing it to this function.
 *
 * @param {string} text
 * @returns {Array<{index: number, start: number, end: number, text: string}>}
 * @throws {Error} if the input is not a valid SRT file
 */
export function parseSrt(text) {
  if (typeof text !== 'string') {
    throw new Error('Input must be a string');
  }
  // Normalize line endings so we can split on \n only.
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const trimmed = normalized.trim();
  if (trimmed === '') {
    return [];
  }
  const blocks = trimmed.split(/\n\s*\n/);
  const cues = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const lines = block.split('\n');
    if (lines.length < 3) {
      throw new Error(`Cue ${i + 1} is missing required lines`);
    }
    const indexLine = lines[0].trim();
    if (!/^\d+$/.test(indexLine)) {
      throw new Error(`Cue ${i + 1} has invalid index: ${JSON.stringify(lines[0])}`);
    }
    const index = Number(indexLine);
    const timestampLine = lines[1].trim();
    const arrowMatch = /^(.*?)\s*-->\s*(.*)$/.exec(timestampLine);
    if (!arrowMatch) {
      throw new Error(`Cue ${i + 1} has invalid timestamp line: ${JSON.stringify(lines[1])}`);
    }
    const start = parseTimestamp(arrowMatch[1].trim());
    const end = parseTimestamp(arrowMatch[2].trim());
    if (end < start) {
      throw new Error(`Cue ${i + 1} ends before it starts`);
    }
    const textLines = lines.slice(2);
    // Join text lines with newlines, preserving internal formatting.
    const cueText = textLines.join('\n');
    cues.push({ index, start, end, text: cueText });
  }
  return cues;
}
