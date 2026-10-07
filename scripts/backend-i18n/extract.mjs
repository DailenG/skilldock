import { readFile, readdir, writeFile } from "node:fs/promises";
import { basename, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const RUST_ROOT = resolve(ROOT, "src-tauri/src");
const EXTRACTED_PATH = resolve(ROOT, "src/app/backend-i18n/extracted-strings.json");
const CATALOG_PATH = resolve(ROOT, "src/app/backend-i18n/catalog-data.json");
const CJK_PATTERN = /[\u3400-\u9fff\uff00-\uffef\u3000-\u303f]/;
const CHECK_MODE = process.argv.includes("--check");

async function findRustFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findRustFiles(path));
    } else if (entry.isFile() && entry.name.endsWith(".rs")) {
      files.push(path);
    }
  }

  return files;
}

function isTestOnlyFile(path, source) {
  const relativePath = relative(ROOT, path).split(sep).join("/");
  const fileName = basename(path);
  return /(^|\/)tests?\//i.test(relativePath)
    || /^test_.*\.rs$/i.test(fileName)
    || /_tests?\.rs$/i.test(fileName)
    || /^#!\s*\[\s*cfg\s*\(\s*test\s*\)\s*\]/.test(source);
}

function blankRange(mask, source, start, end) {
  for (let index = start; index < end; index += 1) {
    if (source[index] !== "\n" && source[index] !== "\r") {
      mask[index] = " ";
    }
  }
}

function skipCharacterLiteral(source, start) {
  let index = start + 1;
  if (index >= source.length || source[index] === "\n" || source[index] === "\r") {
    return null;
  }

  if (source[index] === "\\") {
    index += 1;
    if (source[index] === "u" && source[index + 1] === "{") {
      index += 2;
      while (index < source.length && source[index] !== "}") {
        index += 1;
      }
      if (source[index] !== "}") {
        return null;
      }
      index += 1;
    } else if (source[index] === "x") {
      index += 3;
    } else {
      index += 1;
    }
  } else {
    const codePoint = source.codePointAt(index);
    index += codePoint !== undefined && codePoint > 0xffff ? 2 : 1;
  }

  return source[index] === "'" ? index + 1 : null;
}

function unescapeRustString(value) {
  let output = "";

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character !== "\\") {
      output += character;
      continue;
    }

    const escaped = value[index + 1];
    if (escaped === undefined) {
      output += "\\";
      continue;
    }

    if (escaped === "\n" || escaped === "\r") {
      index += 1;
      if (escaped === "\r" && value[index + 1] === "\n") {
        index += 1;
      }
      while (/\s/.test(value[index + 1] ?? "")) {
        index += 1;
      }
      continue;
    }

    const escapes = {
      "0": "\0",
      "'": "'",
      '"': "\"",
      "\\": "\\",
      n: "\n",
      r: "\r",
      t: "\t",
    };
    if (Object.hasOwn(escapes, escaped)) {
      output += escapes[escaped];
      index += 1;
      continue;
    }

    if (escaped === "x") {
      const hex = value.slice(index + 2, index + 4);
      if (/^[\da-f]{2}$/i.test(hex)) {
        output += String.fromCharCode(Number.parseInt(hex, 16));
        index += 3;
        continue;
      }
    }

    if (escaped === "u" && value[index + 2] === "{") {
      const close = value.indexOf("}", index + 3);
      if (close >= 0) {
        const codePoint = Number.parseInt(value.slice(index + 3, close).replaceAll("_", ""), 16);
        if (Number.isFinite(codePoint) && codePoint <= 0x10ffff) {
          output += String.fromCodePoint(codePoint);
          index = close;
          continue;
        }
      }
    }

    output += escaped;
    index += 1;
  }

  return output;
}

function scanRust(source) {
  const mask = source.split("");
  const strings = [];
  let index = 0;

  while (index < source.length) {
    if (source.startsWith("//", index)) {
      let end = index + 2;
      while (end < source.length && source[end] !== "\n" && source[end] !== "\r") {
        end += 1;
      }
      blankRange(mask, source, index, end);
      index = end;
      continue;
    }

    if (source.startsWith("/*", index)) {
      let depth = 1;
      let end = index + 2;
      while (end < source.length && depth > 0) {
        if (source.startsWith("/*", end)) {
          depth += 1;
          end += 2;
        } else if (source.startsWith("*/", end)) {
          depth -= 1;
          end += 2;
        } else {
          end += 1;
        }
      }
      blankRange(mask, source, index, end);
      index = end;
      continue;
    }

    if (source[index] === "r") {
      let quote = index + 1;
      while (source[quote] === "#") {
        quote += 1;
      }
      if (source[quote] === "\"") {
        const hashes = source.slice(index + 1, quote);
        const closing = `"${hashes}`;
        const closeIndex = source.indexOf(closing, quote + 1);
        const end = closeIndex < 0 ? source.length : closeIndex + closing.length;
        const value = source.slice(quote + 1, closeIndex < 0 ? source.length : closeIndex);
        strings.push({ start: index, end, value });
        blankRange(mask, source, index, end);
        index = end;
        continue;
      }
    }

    if (source[index] === "\"") {
      let end = index + 1;
      let escaped = false;
      while (end < source.length) {
        const character = source[end];
        if (!escaped && character === "\"") {
          end += 1;
          break;
        }
        if (!escaped && character === "\\") {
          escaped = true;
        } else {
          escaped = false;
        }
        end += 1;
      }
      const value = unescapeRustString(source.slice(index + 1, Math.max(index + 1, end - 1)));
      strings.push({ start: index, end, value });
      blankRange(mask, source, index, end);
      index = end;
      continue;
    }

    if (source[index] === "'") {
      const end = skipCharacterLiteral(source, index);
      if (end !== null) {
        blankRange(mask, source, index, end);
        index = end;
        continue;
      }
    }

    index += 1;
  }

  return { mask: mask.join(""), strings };
}

function findTestModuleRanges(mask) {
  const ranges = [];
  const pattern = /#\s*\[\s*cfg\s*\(\s*test\s*\)\s*\]\s*mod\s+tests\s*\{/g;
  let match;

  while ((match = pattern.exec(mask)) !== null) {
    const openingBrace = match.index + match[0].lastIndexOf("{");
    let depth = 0;
    let end = openingBrace;

    for (; end < mask.length; end += 1) {
      if (mask[end] === "{") {
        depth += 1;
      } else if (mask[end] === "}") {
        depth -= 1;
        if (depth === 0) {
          end += 1;
          break;
        }
      }
    }

    ranges.push([match.index, end]);
    pattern.lastIndex = end;
  }

  return ranges;
}

function isInsideRange(index, ranges) {
  return ranges.some(([start, end]) => index >= start && index < end);
}

async function extractStrings() {
  const files = await findRustFiles(RUST_ROOT);
  const values = new Set();

  for (const path of files) {
    const source = await readFile(path, "utf8");
    if (isTestOnlyFile(path, source)) {
      continue;
    }

    const { mask, strings } = scanRust(source);
    const testRanges = findTestModuleRanges(mask);
    for (const string of strings) {
      if (!isInsideRange(string.start, testRanges) && CJK_PATTERN.test(string.value)) {
        values.add(string.value);
      }
    }
  }

  return [...values].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

async function readCatalog() {
  try {
    return JSON.parse(await readFile(CATALOG_PATH, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

const extractedStrings = await extractStrings();

if (!CHECK_MODE) {
  await writeFile(EXTRACTED_PATH, `${JSON.stringify(extractedStrings, null, 2)}\n`);
  console.log(`Extracted ${extractedStrings.length} unique CJK strings to ${relative(ROOT, EXTRACTED_PATH)}.`);
} else {
  const catalog = await readCatalog();
  const extractedSet = new Set(extractedStrings);
  const catalogKeys = Object.keys(catalog);
  const missing = extractedStrings.filter((value) => !Object.hasOwn(catalog, value));
  const stale = catalogKeys.filter((value) => !extractedSet.has(value));

  if (missing.length > 0) {
    console.error("Uncatalogued backend strings:");
    for (const value of missing) {
      console.error(`- ${JSON.stringify(value)}`);
    }
  } else {
    console.log(`All ${extractedStrings.length} extracted strings are catalogued.`);
  }

  if (stale.length > 0) {
    console.warn("Stale backend catalog keys (warnings):");
    for (const value of stale) {
      console.warn(`- ${JSON.stringify(value)}`);
    }
  }

  if (missing.length > 0) {
    process.exitCode = 1;
  }
}
