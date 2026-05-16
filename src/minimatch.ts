/**
 * Simple glob pattern matching (subset of minimatch).
 * Supports: *, ?, **, and character classes [abc].
 * Zero dependencies.
 */
export function minimatch(str: string, pattern: string): boolean {
  const regex = globToRegex(pattern);
  return regex.test(str);
}

function globToRegex(pattern: string): RegExp {
  let regex = "";
  let i = 0;

  while (i < pattern.length) {
    const ch = pattern[i];

    switch (ch) {
      case "*":
        if (pattern[i + 1] === "*") {
          // ** matches any path
          regex += ".*";
          i += 2;
          if (pattern[i] === "/") i++; // skip trailing /
        } else {
          // * matches anything except /
          regex += "[^/]*";
          i++;
        }
        break;
      case "?":
        regex += "[^/]";
        i++;
        break;
      case "[": {
        let j = i + 1;
        while (j < pattern.length && pattern[j] !== "]") j++;
        regex += pattern.slice(i, j + 1);
        i = j + 1;
        break;
      }
      case ".":
      case "(":
      case ")":
      case "+":
      case "^":
      case "$":
      case "|":
      case "{":
      case "}":
      case "\\":
        regex += "\\" + ch;
        i++;
        break;
      default:
        regex += ch;
        i++;
    }
  }

  return new RegExp(`^${regex}$`);
}
