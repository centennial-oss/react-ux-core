// Components catalog: writes docs/COMPONENTS-CATALOG.md, one paragraph per Storybook story file, grouped into the
// sidebar sections Storybook shows (the first segment of each story's title). Each control's name links to its Docs
// page on the published Storybook.
//
// Each paragraph's text is the description Storybook shows at the top of the control's Docs page, found in the
// order Storybook looks for it: the meta's `parameters.docs.description.component`, then the meta's JSDoc, then the
// JSDoc of the meta's `component`. Story files with none of those (often ones without a `component`) fall back to
// the JSDoc of their first story, which the Docs page shows under the primary story, and are listed as a warning.
//
// Usage: node scripts/controls-catalog.mjs [--out <file>] [--quiet]
//   --out    write the catalog there instead of docs/COMPONENTS-CATALOG.md (`make catalog-check` diffs the two).
//   --quiet  don't warn about Docs pages without a component description.
// Both flags are common to the generators (see generatorArgs in ts-program.mjs).

import { writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import { toId } from 'storybook/internal/csf';
import ts from 'typescript';
import { createProgram, generatorArgs, root, storyFiles } from './ts-program.mjs';

const { out: OUT, isQuiet } = generatorArgs('docs/COMPONENTS-CATALOG.md');

// The latest release's Storybook. The site root only redirects to latest/, which would drop the ?path= query.
const STORYBOOK_URL = 'https://ccux.centennialoss.org/latest/';

const program = createProgram(storyFiles);
const checker = program.getTypeChecker();

const squash = (text) => text.replace(/\s+/g, ' ').trim();
const rel = (file) => relative(root, file);

function unwrap(expression) {
  let node = expression;
  while (
    ts.isSatisfiesExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isParenthesizedExpression(node)
  ) {
    node = node.expression;
  }
  return node;
}

function propertyOf(object, name) {
  return object?.properties.find((property) => property.name?.getText() === name);
}

// The object literal a property points at, following `parameters: { docs: { ... } }` style paths.
function objectAt(object, path) {
  let current = object;
  for (const name of path) {
    const property = propertyOf(current, name);
    const value = property && ts.isPropertyAssignment(property) && unwrap(property.initializer);
    current = value && ts.isObjectLiteralExpression(value) ? value : undefined;
  }
  return current;
}

function stringOf(property) {
  const value = property && ts.isPropertyAssignment(property) && unwrap(property.initializer);
  return value && ts.isStringLiteralLike(value) ? value.text : '';
}

function jsDocOf(node) {
  return squash(
    ts
      .getJSDocCommentsAndTags(node)
      .filter(ts.isJSDoc)
      .map((doc) => ts.getTextOfJSDocComment(doc.comment) ?? '')
      .join(' '),
  );
}

function componentDoc(property) {
  if (!property) {
    return '';
  }
  let symbol = ts.isShorthandPropertyAssignment(property)
    ? checker.getShorthandAssignmentValueSymbol(property)
    : checker.getSymbolAtLocation(unwrap(property.initializer));
  if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
    symbol = checker.getAliasedSymbol(symbol);
  }
  return symbol ? squash(ts.displayPartsToString(symbol.getDocumentationComment(checker))) : '';
}

// The meta object, the statements whose JSDoc counts as the meta's, and the first story's declaration.
function readStoryFile(file) {
  const source = program.getSourceFile(file);
  const exported = source.statements.find(
    (statement) => ts.isExportAssignment(statement) && !statement.isExportEquals,
  );
  if (!exported) {
    throw new Error(`${rel(file)}: no default export (the story meta)`);
  }
  const docNodes = [exported];
  let meta = unwrap(exported.expression);
  if (ts.isIdentifier(meta)) {
    const declaration = checker.getSymbolAtLocation(meta)?.valueDeclaration;
    if (declaration && ts.isVariableDeclaration(declaration) && declaration.initializer) {
      docNodes.push(declaration);
      meta = unwrap(declaration.initializer);
    }
  }
  if (!ts.isObjectLiteralExpression(meta)) {
    throw new Error(`${rel(file)}: the default export isn't an object literal meta`);
  }
  const firstStory = source.statements
    .filter(
      (statement) =>
        ts.isVariableStatement(statement) &&
        statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword),
    )
    .flatMap((statement) => statement.declarationList.declarations)[0];
  return { meta, docNodes, firstStory };
}

const sections = new Map();
const undescribed = [];
const fallbacks = [];

for (const file of storyFiles) {
  const { meta, docNodes, firstStory } = readStoryFile(file);
  const title = stringOf(propertyOf(meta, 'title'));
  if (!title) {
    throw new Error(`${rel(file)}: the meta has no string title`);
  }
  const [section, ...rest] = title.split('/');
  const name = rest.join(' / ') || section;
  // Storybook's own id for the Docs page, from the meta's `id` if it sets one, else its title.
  const url = `${STORYBOOK_URL}?path=/docs/${toId(stringOf(propertyOf(meta, 'id')) || title, 'Docs')}`;
  let description =
    stringOf(propertyOf(objectAt(meta, ['parameters', 'docs', 'description']), 'component')) ||
    docNodes.map(jsDocOf).find(Boolean) ||
    componentDoc(propertyOf(meta, 'component'));
  if (!description) {
    description = firstStory ? jsDocOf(firstStory) : '';
    (description ? fallbacks : undescribed).push(`${title} (${rel(file)})`);
  }
  if (!sections.has(section)) {
    sections.set(section, []);
  }
  sections
    .get(section)
    .push({ name, url, description: squash(description) || '_No description yet._' });
}

const byName = (a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' });
const lines = [
  '# Components Catalog',
  '',
  `<!-- Generated by \`make catalog\` (scripts/controls-catalog.mjs) from the Storybook stories. Don't edit by hand. -->`,
  '',
  `${storyFiles.length} controls in ${sections.size} sections, one per Storybook Docs page. Each description is the one` +
    ' shown at the top of that page; each name links to the page in the' +
    ` [latest release's Storybook](${STORYBOOK_URL}).`,
];
for (const section of [...sections.keys()].sort(byName)) {
  lines.push('', `## ${section}`);
  for (const { name, url, description } of sections
    .get(section)
    .sort((a, b) => byName(a.name, b.name))) {
    lines.push('', `**[${name}](${url})**: ${description}`);
  }
}
writeFileSync(OUT, lines.join('\n') + '\n');

if (fallbacks.length && !isQuiet) {
  console.warn(
    `Components catalog: ${fallbacks.length} Docs pages have no component description, so the first story's is used.` +
      ' Give the meta a `component` with JSDoc, or a JSDoc of its own:\n' +
      fallbacks.map((entry) => `  ${entry}`).join('\n'),
  );
}
if (undescribed.length && !isQuiet) {
  console.warn(
    `Components catalog: ${undescribed.length} Docs pages have no description at all:\n` +
      undescribed.map((entry) => `  ${entry}`).join('\n'),
  );
}
