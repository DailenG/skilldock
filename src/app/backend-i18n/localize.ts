import { BACKEND_TEXT_EN } from "./catalog";
import { getBackendTextLanguage } from "./language";

const CJK_PATTERN = /[\u3400-\u9fff\uff00-\uffef\u3000-\u303f]/;
const BACKEND_ERROR_PLACEHOLDER_NAME = /^(?:e|err|error|reason|message|msg|detail|details|cause)$/i;
const BACKEND_ERROR_PLACEHOLDER_SUFFIX = /_(?:error|err|message|reason|detail)$/i;
const BACKEND_SENTENCE_PUNCTUATION = /[。！？；：，]/;
const PLACEHOLDER_CONTENT = /^(?:[A-Za-z_][A-Za-z0-9_]*(?::[^{}]*)?|[0-9]+(?::[^{}]*)?|:[^{}]*|)$/;

type TemplatePart =
  | { type: "literal"; value: string }
  | { type: "placeholder"; value: string; name?: string; debug: boolean };

type CompiledTemplate = {
  key: string;
  value: string;
  parts: TemplatePart[];
  regex: RegExp;
  literalLength: number;
};

let compiledTemplates: CompiledTemplate[] | undefined;
let literalCatalog: Map<string, string> | undefined;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseTemplate(template: string): TemplatePart[] {
  const parts: TemplatePart[] = [];
  let literal = "";

  for (let index = 0; index < template.length;) {
    if (template.startsWith("{{", index)) {
      literal += "{";
      index += 2;
      continue;
    }
    if (template.startsWith("}}", index)) {
      literal += "}";
      index += 2;
      continue;
    }
    if (template[index] === "{") {
      const end = template.indexOf("}", index + 1);
      if (end >= 0) {
        const content = template.slice(index + 1, end);
        if (PLACEHOLDER_CONTENT.test(content)) {
          if (literal) {
            parts.push({ type: "literal", value: literal });
            literal = "";
          }
          const name = /^[A-Za-z_][A-Za-z0-9_]*/.exec(content)?.[0];
          parts.push({
            type: "placeholder",
            value: template.slice(index, end + 1),
            ...(name ? { name } : {}),
            debug: /:#?\?$/.test(content),
          });
          index = end + 1;
          continue;
        }
      }
    }

    literal += template[index];
    index += 1;
  }

  if (literal) {
    parts.push({ type: "literal", value: literal });
  }
  return parts;
}

function getCompiledTemplates() {
  if (compiledTemplates) {
    return compiledTemplates;
  }

  compiledTemplates = Object.entries(BACKEND_TEXT_EN)
    .map(([key, value]) => {
      const parts = parseTemplate(key);
      if (!parts.some((part) => part.type === "placeholder")) {
        return null;
      }

      const pattern = parts.map((part) =>
        part.type === "placeholder" ? "([\\s\\S]+?)" : escapeRegExp(part.value)
      ).join("");
      return {
        key,
        value,
        parts,
        regex: new RegExp(`^${pattern}$`),
        literalLength: parts.reduce(
          (length, part) => length + (part.type === "literal" ? part.value.length : 0),
          0,
        ),
      };
    })
    .filter((template): template is CompiledTemplate => template !== null)
    .sort((left, right) =>
      right.literalLength - left.literalLength || right.key.length - left.key.length
    );
  return compiledTemplates;
}

function getLiteralCatalog() {
  if (literalCatalog) {
    return literalCatalog;
  }

  literalCatalog = new Map();
  for (const [key, value] of Object.entries(BACKEND_TEXT_EN)) {
    const parts = parseTemplate(key);
    if (parts.every((part) => part.type === "literal")) {
      literalCatalog.set(parts.map((part) => part.value).join(""), value);
    }
  }
  return literalCatalog;
}

function isNestedBackendMessage(text: string) {
  const normalizedText = text.trim();
  if (getCompiledTemplates().some((template) => template.regex.test(normalizedText))) {
    return true;
  }

  return BACKEND_SENTENCE_PUNCTUATION.test(normalizedText)
    && (
      Object.prototype.hasOwnProperty.call(BACKEND_TEXT_EN, normalizedText)
      || getLiteralCatalog().has(normalizedText)
    );
}

function getNestedPrefixCandidate(text: string) {
  const firstCjkIndex = text.search(CJK_PATTERN);
  const boundary = firstCjkIndex >= 0
    ? text.lastIndexOf(": ", firstCjkIndex)
    : -1;
  if (boundary < 0) {
    return null;
  }

  const prefixEnd = boundary + 2;
  const rest = text.slice(prefixEnd);
  return isNestedBackendMessage(rest)
    ? { prefix: text.slice(0, prefixEnd), rest }
    : null;
}

function renderTemplate(
  template: string,
  namedValues: Map<string, string[]>,
  unnamedValues: string[],
  language: "en",
  memo: Map<string, string>,
) {
  let unnamedIndex = 0;
  return parseTemplate(template).map((part) => {
    if (part.type === "literal") {
      return part.value;
    }

    const captured = part.name
      ? namedValues.get(part.name)?.shift()
      : unnamedValues[unnamedIndex++];
    if (captured === undefined) {
      return part.value;
    }

    const shouldLocalizeCaptured = !part.debug && (part.name
      ? BACKEND_ERROR_PLACEHOLDER_NAME.test(part.name)
        || BACKEND_ERROR_PLACEHOLDER_SUFFIX.test(part.name)
      : isNestedBackendMessage(captured));
    return shouldLocalizeCaptured
      ? localizeBackendTextInternal(captured, language, memo)
      : captured;
  }).join("");
}

function matchTemplate(
  text: string,
  template: CompiledTemplate,
  language: "en",
  memo: Map<string, string>,
) {
  const matches = template.regex.exec(text);
  if (!matches) {
    return null;
  }

  const namedValues = new Map<string, string[]>();
  const unnamedValues: string[] = [];
  let captureIndex = 1;
  for (const part of template.parts) {
    if (part.type !== "placeholder") {
      continue;
    }

    const captured = matches[captureIndex++];
    if (part.name) {
      const captures = namedValues.get(part.name) ?? [];
      captures.push(captured);
      namedValues.set(part.name, captures);
    } else {
      unnamedValues.push(captured);
    }
  }

  return renderTemplate(template.value, namedValues, unnamedValues, language, memo);
}

function countCjkCharacters(text: string) {
  return text.match(/[\u3400-\u9fff\uff00-\uffef\u3000-\u303f]/g)?.length ?? 0;
}

function localizeResidualText(text: string, language: "en", memo: Map<string, string>) {
  let bestText = text;
  let bestCount = countCjkCharacters(text);

  function consider(candidate: string) {
    const candidateCount = countCjkCharacters(candidate);
    if (candidateCount < bestCount) {
      bestText = candidate;
      bestCount = candidateCount;
    }
  }

  const prefixCandidate = getNestedPrefixCandidate(text);
  if (prefixCandidate) {
    consider(
      prefixCandidate.prefix
      + localizeBackendTextInternal(prefixCandidate.rest, language, memo),
    );
  }

  if (text.includes("\n")) {
    consider(text.split("\n").map((line) => {
      return isNestedBackendMessage(line) || getNestedPrefixCandidate(line)
        ? localizeBackendTextInternal(line, language, memo)
        : line;
    }).join("\n"));
  }

  return bestText;
}

function localizeBackendTextInternal(
  text: string,
  language: ReturnType<typeof getBackendTextLanguage>,
  memo: Map<string, string>,
): string {
  if (memo.has(text)) {
    return memo.get(text)!;
  }

  if (language !== "en" || !CJK_PATTERN.test(text)) {
    memo.set(text, text);
    return text;
  }

  const normalizedText = text.trim();
  const exactMatch = BACKEND_TEXT_EN[normalizedText];
  let translatedText = exactMatch ?? text;
  if (exactMatch === undefined) {
    const literalMatch = getLiteralCatalog().get(normalizedText);
    if (literalMatch !== undefined) {
      translatedText = literalMatch;
    } else {
      for (const template of getCompiledTemplates()) {
        const translated = matchTemplate(normalizedText, template, language, memo);
        if (translated !== null) {
          translatedText = translated;
          break;
        }
      }
    }
  }

  if (!CJK_PATTERN.test(translatedText)) {
    memo.set(text, translatedText);
    return translatedText;
  }

  let bestText = translatedText;
  const sourceCandidate = localizeResidualText(text, language, memo);
  if (countCjkCharacters(sourceCandidate) < countCjkCharacters(bestText)) {
    bestText = sourceCandidate;
  }
  memo.set(text, bestText);
  return bestText;
}

export function localizeBackendText(
  text: string,
  language = getBackendTextLanguage(),
): string {
  return localizeBackendTextInternal(text, language, new Map());
}
