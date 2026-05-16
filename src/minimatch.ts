/**
 * Simple glob pattern matching (subset of minimatch).
 * Supports: *, ?, **, and character classes [abc].
 * Zero dependencies.
 */
export function minimatch(str: string, pattern: string): boolean {
  return globMatch(str, pattern);
}

/**
 * Match a string against a glob pattern without regex (avoids injection).
 * Uses recursive backtracking.
 */
function globMatch(str: string, pattern: string): boolean {
  let si = 0;
  let pi = 0;
  let starSi = -1;
  let starPi = -1;

  while (si < str.length) {
    if (pi < pattern.length && matchChar(str[si], pattern, pi)) {
      const advance = charAdvance(pattern, pi);
      si++;
      pi += advance;
    } else if (pi < pattern.length && pattern[pi] === "*") {
      if (pi + 1 < pattern.length && pattern[pi + 1] === "*") {
        // ** matches everything including /
        const restPi = pattern[pi + 2] === "/" ? pi + 3 : pi + 2;
        // Try matching rest of pattern at every position
        for (let k = si; k <= str.length; k++) {
          if (globMatch(str.slice(k), pattern.slice(restPi))) {
            return true;
          }
        }
        return false;
      }
      // * matches anything except /
      starSi = si;
      starPi = pi;
      pi++;
    } else if (starPi >= 0) {
      starSi++;
      if (str[starSi - 1] === "/") {
        return false; // * does not cross /
      }
      si = starSi;
      pi = starPi + 1;
    } else {
      return false;
    }
  }

  // Consume trailing * or ** in pattern
  while (pi < pattern.length && pattern[pi] === "*") pi++;

  return pi === pattern.length;
}

function matchChar(ch: string, pattern: string, pi: number): boolean {
  const pc = pattern[pi];

  if (pc === "?") {
    return ch !== "/";
  }

  if (pc === "[") {
    // Character class
    let j = pi + 1;
    let negate = false;
    if (j < pattern.length && (pattern[j] === "!" || pattern[j] === "^")) {
      negate = true;
      j++;
    }
    let found = false;
    while (j < pattern.length && pattern[j] !== "]") {
      if (j + 2 < pattern.length && pattern[j + 1] === "-" && pattern[j + 2] !== "]") {
        // Range
        if (ch >= pattern[j] && ch <= pattern[j + 2]) {
          found = true;
        }
        j += 3;
      } else {
        if (ch === pattern[j]) {
          found = true;
        }
        j++;
      }
    }
    return negate ? !found : found;
  }

  return pc === ch;
}

function charAdvance(pattern: string, pi: number): number {
  if (pattern[pi] === "[") {
    let j = pi + 1;
    while (j < pattern.length && pattern[j] !== "]") j++;
    return j - pi + 1;
  }
  return 1;
}
