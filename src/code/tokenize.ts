// A small syntax tokenizer for CodeBlock: keywords, strings, numbers, comments, punctuation and properties (keys,
// variables) for the languages CodeBlock knows, with no dependency. It colours code for reading; it isn't a parser.
// Tokens are plain text, rendered as React elements, so code can never inject markup.

export type CodeLanguage =
  'json' | 'yaml' | 'hcl' | 'bash' | 'typescript' | 'javascript' | 'go' | 'python' | 'sql' | 'text';

export type CodeTokenType =
  'plain' | 'keyword' | 'string' | 'number' | 'comment' | 'punct' | 'property';

export interface CodeToken {
  type: CodeTokenType;
  text: string;
}

/** Splits code into lines of tokens. CodeBlock's `highlight` prop takes a function of this shape. */
export type CodeHighlighter = (code: string, language: CodeLanguage) => CodeToken[][];

type Rule = [pattern: RegExp, type: CodeTokenType];

const words = (list: string, flags = '') =>
  new RegExp(`\\b(?:${list.split(' ').join('|')})\\b`, `y${flags}`);

const NUMBER: Rule = [/-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/y, 'number'];
const DOUBLE: Rule = [/"(?:[^"\\\n]|\\.)*"/y, 'string'];
const SINGLE: Rule = [/'(?:[^'\\\n]|\\.)*'/y, 'string'];
const SLASH_COMMENTS: Rule = [/\/\/.*|\/\*[\s\S]*?(?:\*\/|$)/y, 'comment'];
const HASH_COMMENT: Rule = [/#.*/y, 'comment'];

const JS_KEYWORDS =
  'const let var function return if else for while do switch case break continue new class extends import export from default async await try catch finally throw typeof instanceof in of interface type enum implements public private protected readonly static as satisfies void null undefined true false this super yield keyof';

const rules: Record<Exclude<CodeLanguage, 'text'>, Rule[]> = {
  json: [
    [/"(?:[^"\\\n]|\\.)*"(?=\s*:)/y, 'property'],
    DOUBLE,
    NUMBER,
    [words('true false null'), 'keyword'],
    [/[{}[\],:]/y, 'punct'],
  ],
  yaml: [
    HASH_COMMENT,
    [/[A-Za-z_][\w.-]*(?=\s*:(?:\s|$))/y, 'property'],
    DOUBLE,
    SINGLE,
    NUMBER,
    [words('true false null yes no on off'), 'keyword'],
    [/[-:[\]{},|>]/y, 'punct'],
  ],
  hcl: [
    [/#.*|\/\/.*|\/\*[\s\S]*?(?:\*\/|$)/y, 'comment'],
    DOUBLE,
    [
      words(
        'resource data variable output locals module provider terraform true false null for in if',
      ),
      'keyword',
    ],
    [/[A-Za-z_][\w-]*(?=\s*=(?!=))/y, 'property'],
    NUMBER,
    [/[{}[\]=(),.:?]/y, 'punct'],
  ],
  bash: [
    [/(?<![\w$])#.*/y, 'comment'],
    [/"(?:[^"\\]|\\.)*"/y, 'string'],
    [/'[^']*'/y, 'string'],
    [/\$\{[^}\n]*\}|\$[\w@#?*!-]+/y, 'property'],
    [
      words(
        'if then else elif fi for while until do done case esac in function return export local readonly set unset echo cd source',
      ),
      'keyword',
    ],
    [/\b\d+\b/y, 'number'],
    [/[|&;<>(){}[\]=]/y, 'punct'],
  ],
  typescript: [
    SLASH_COMMENTS,
    DOUBLE,
    SINGLE,
    [/`(?:[^`\\]|\\.)*`/y, 'string'],
    [words(JS_KEYWORDS), 'keyword'],
    NUMBER,
    [/(?<=\.)[A-Za-z_$][\w$]*/y, 'property'],
    [/[{}()[\];,.<>=+\-*/%&|^!?:~]/y, 'punct'],
  ],
  javascript: [],
  go: [
    SLASH_COMMENTS,
    DOUBLE,
    [/`[^`]*`/y, 'string'],
    [/'(?:[^'\\\n]|\\.)'/y, 'string'],
    [
      words(
        'break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var true false nil iota',
      ),
      'keyword',
    ],
    NUMBER,
    [/(?<=\.)[A-Za-z_][\w]*/y, 'property'],
    [/[{}()[\];,.<>=+\-*/%&|^!:]/y, 'punct'],
  ],
  python: [
    HASH_COMMENT,
    [/[rbfuRBFU]{0,2}(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$))/y, 'string'],
    [/[rbfuRBFU]{0,2}(?:"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/y, 'string'],
    [/@[\w.]+/y, 'keyword'],
    [
      words(
        'and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield self',
      ),
      'keyword',
    ],
    NUMBER,
    [/(?<=\.)[A-Za-z_]\w*/y, 'property'],
    [/[{}()[\];,.<>=+\-*/%&|^!:~]/y, 'punct'],
  ],
  sql: [
    [/--.*|\/\*[\s\S]*?(?:\*\/|$)/y, 'comment'],
    [/'(?:[^']|'')*'/y, 'string'],
    [
      words(
        'select from where and or not in is null as join left right inner outer full cross on group by order having limit offset insert into values update set delete create table view alter drop index primary key foreign references distinct union all case when then else end exists between like asc desc count sum avg min max with returning',
        'i',
      ),
      'keyword',
    ],
    NUMBER,
    [/[(),;.*=<>]/y, 'punct'],
  ],
};
rules.javascript = rules.typescript;

function tokenize(code: string, language: CodeLanguage): CodeToken[] {
  if (language === 'text') {
    return [{ type: 'plain', text: code }];
  }
  const list = rules[language];
  const tokens: CodeToken[] = [];
  const push = (type: CodeTokenType, text: string) => {
    const last = tokens.at(-1);
    if (type === 'plain' && last?.type === 'plain') {
      last.text += text;
    } else {
      tokens.push({ type, text });
    }
  };
  let index = 0;
  while (index < code.length) {
    let matched = false;
    for (const [pattern, type] of list) {
      pattern.lastIndex = index;
      const match = pattern.exec(code);
      if (match && match[0].length > 0) {
        push(type, match[0]);
        index += match[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Plain text up to the next character a rule could start on (letters run together so words stay whole).
      const word = /[A-Za-z_$][\w$-]*|\s+|./y;
      word.lastIndex = index;
      const text = word.exec(code)?.[0] ?? code.charAt(index);
      push('plain', text);
      index += text.length;
    }
  }
  return tokens;
}

/** The built-in highlighter: `code` as lines of tokens (a multi-line comment or string is split across lines). */
export const highlightCode: CodeHighlighter = (code, language) => {
  const lines: CodeToken[][] = [[]];
  for (const token of tokenize(code.replace(/\r\n?/g, '\n'), language)) {
    token.text.split('\n').forEach((part, index) => {
      if (index > 0) {
        lines.push([]);
      }
      if (part !== '') {
        lines.at(-1)?.push({ type: token.type, text: part });
      }
    });
  }
  return lines;
};
