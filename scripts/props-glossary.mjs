// Props glossary: writes docs/PROPS-GLOSSARY.md from the exported components' prop types.
//
// The TypeScript compiler reads every entry point (src/index.ts and src/*/index.ts), then every exported `*Props`
// type and every exported component whose props are declared inline. Only props declared under src/ are listed;
// props inherited from React Aria or the DOM are summarised per component.
//
// Judgement that the compiler can't make lives in scripts/props-glossary.json:
// - `shared`: for a prop name used by several components, its canonical summary and whether its meaning or type
//   varies between them (status `consistent`, `type` or `meaning`).
// - `descriptions`: descriptions for props that have no JSDoc.
// - `nearDuplicates`: different names that mean the same thing.
// Shared names with no entry there are reported as unreviewed, so add one when you add a shared prop.
//
// Usage: node scripts/props-glossary.mjs [--out <file>] [--quiet]
//   --out    write the glossary there instead of docs/PROPS-GLOSSARY.md (`make props-glossary-check` diffs the two).
//   --quiet  don't warn about unreviewed or stale entries in scripts/props-glossary.json, or report what was written.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { checker, entries, entryLabel, exportsOf, isOwn, root } from './entries.mjs';
import { generatorArgs } from './ts-program.mjs';

const { out: OUT, isQuiet } = generatorArgs('docs/PROPS-GLOSSARY.md');
const annotations = JSON.parse(readFileSync(join(root, 'scripts/props-glossary.json'), 'utf8'));

// Longest type text shown in a table cell, and most types listed for one prop name.
const MAX_TYPE_CHARS = 100;
const MAX_TYPES = 6;
// Most components named in a glossary row's "Used by" cell.
const MAX_USED_BY = 8;

const PACKAGE_LABELS = {
  'react-aria-components': 'React Aria Components',
  'react-aria': 'react-aria',
  'react-stately': 'react-stately',
  '@react-types/shared': 'React Aria shared types',
  '@types/react': 'React / DOM attributes',
};

// ---- Extraction ----

const squash = (text) =>
  text
    .replace(/\s+/g, ' ')
    .replace(/\(\s/g, '(')
    .replace(/\s\)/g, ')')
    .replace(/;\s*}/g, ' }')
    .trim();
const rel = (file) => relative(root, file);
const lineOf = (node) =>
  node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line + 1;
const docOf = (symbol) => squash(ts.displayPartsToString(symbol.getDocumentationComment(checker)));

function typeTextOf(prop, decl) {
  if (decl.type) {
    return squash(decl.type.getText());
  }
  return checker.typeToString(checker.getTypeOfSymbolAtLocation(prop, decl));
}

// Own props of a type, merging the members of a union. Returns the props plus the packages that inherited props
// come from.
function collectProps(type) {
  const props = new Map();
  const inherited = new Set();
  for (const part of type.isUnion() ? type.types : [type]) {
    for (const prop of checker.getPropertiesOfType(part)) {
      const decl = prop.declarations?.find(isOwn);
      if (!decl) {
        const fileName = prop.declarations?.[0]?.getSourceFile().fileName ?? '';
        const pkg = fileName.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
        if (pkg) {
          inherited.add(pkg[1]);
        }
        continue;
      }
      const name = prop.getName();
      const typeText = typeTextOf(prop, decl);
      const isOptional = Boolean(prop.flags & ts.SymbolFlags.Optional);
      const existing = props.get(name);
      if (existing) {
        if (!existing.types.includes(typeText)) {
          existing.types.push(typeText);
        }
        existing.isOptional ||= isOptional;
        existing.doc ||= docOf(prop);
        continue;
      }
      props.set(name, { name, types: [typeText], isOptional, doc: docOf(prop) });
    }
  }
  return { props: [...props.values()], inherited: [...inherited] };
}

const components = [];
const seen = new Set();

for (const entry of entries) {
  for (const { name, symbol } of exportsOf(entry)) {
    if (
      !/Props$/.test(name) ||
      !(symbol.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias))
    ) {
      continue;
    }
    const decl = symbol.declarations?.[0];
    const key = decl && `${decl.getSourceFile().fileName}#${name}`;
    if (!decl || !isOwn(decl) || seen.has(key)) {
      continue;
    }
    seen.add(key);
    const type = checker.getDeclaredTypeOfSymbol(symbol);
    components.push({
      component: name.replace(/Props$/, ''),
      propsType: name,
      isUnion: type.isUnion(),
      entry: entryLabel(entry),
      file: rel(decl.getSourceFile().fileName),
      line: lineOf(decl),
      ...collectProps(type),
    });
  }
}

// Components whose props are an inline type literal or an Omit<> of another props type.
const propsTypeNames = new Set(components.map((c) => c.propsType));
for (const entry of entries) {
  for (const { name, symbol } of exportsOf(entry)) {
    if (
      !/^[A-Z]/.test(name) ||
      !(symbol.flags & (ts.SymbolFlags.Function | ts.SymbolFlags.Variable))
    ) {
      continue;
    }
    const decl = symbol.declarations?.[0];
    if (!decl || !isOwn(decl)) {
      continue;
    }
    const [signature] = checker.getTypeOfSymbolAtLocation(symbol, decl).getCallSignatures();
    const typeNode = signature?.parameters[0]?.valueDeclaration?.type;
    if (!typeNode || propsTypeNames.has(typeNode.getText().replace(/<.*$/s, ''))) {
      continue;
    }
    if (!ts.isTypeLiteralNode(typeNode) && !/^Omit</.test(typeNode.getText())) {
      continue;
    }
    const key = `${decl.getSourceFile().fileName}#${name}(inline)`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const { props } = collectProps(checker.getTypeFromTypeNode(typeNode));
    if (props.length) {
      components.push({
        component: name,
        propsType: null,
        isUnion: false,
        entry: entryLabel(entry),
        file: rel(decl.getSourceFile().fileName),
        line: lineOf(decl),
        props,
        inherited: [],
      });
    }
  }
}

// ---- Analysis ----

const usesByName = new Map();
for (const c of components) {
  for (const prop of c.props) {
    if (!usesByName.has(prop.name)) {
      usesByName.set(prop.name, []);
    }
    usesByName.get(prop.name).push({ component: c.component, prop });
  }
}
const names = [...usesByName.keys()].sort(
  (a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }) || a.localeCompare(b),
);

function typeCounts(name) {
  const counts = new Map();
  for (const { prop } of usesByName.get(name)) {
    const text = prop.types.join(' | ');
    counts.set(text, (counts.get(text) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

const isShared = (name) => usesByName.get(name).length > 1;
// A shared name whose components all agree on the type and JSDoc needs no review.
const hasVariants = (name) =>
  new Set(usesByName.get(name).map(({ prop }) => `${prop.types.join(' | ')}\u0001${prop.doc}`))
    .size > 1;
// Shared names nobody has reviewed yet: a differing type is flagged, though only a review can judge meaning.
const unreviewed = names.filter((name) => hasVariants(name) && !annotations.shared[name]);

function statusOf(name) {
  const reviewed = annotations.shared[name];
  if (reviewed) {
    return reviewed.status;
  }
  return isShared(name) && typeCounts(name).length > 1 ? 'type' : 'consistent';
}

function firstSentences(text, max = 220) {
  if (text.length <= max) {
    return text;
  }
  const cut = text.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.) '));
  return end > 60 ? cut.slice(0, end + 1) : truncate(text, max);
}

function descriptionOf(name) {
  if (annotations.shared[name]?.summary) {
    return annotations.shared[name].summary;
  }
  const docs = usesByName
    .get(name)
    .map(({ prop }) => prop.doc)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  return docs.length
    ? firstSentences(docs[0])
    : (annotations.descriptions[name] ?? '_Undocumented._');
}

function varianceOf(name) {
  if (annotations.shared[name]) {
    return annotations.shared[name].variance;
  }
  const byType = new Map();
  for (const { component, prop } of usesByName.get(name)) {
    const text = prop.types.join(' | ');
    byType.set(text, [...(byType.get(text) ?? []), component]);
  }
  const detail = [...byType].map(
    ([text, comps]) => `${code(truncate(text, 60))} on ${comps.join(', ')}`,
  );
  return `_Unreviewed._ ${detail.join('; ')}.`;
}

function requiredOf(name) {
  const optional = usesByName.get(name).map(({ prop }) => prop.isOptional);
  if (optional.every(Boolean)) {
    return 'no';
  }
  return optional.some(Boolean) ? 'mixed' : 'yes';
}

function usedBy(name) {
  const comps = [...new Set(usesByName.get(name).map((use) => use.component))].sort();
  if (comps.length <= MAX_USED_BY) {
    return comps.join(', ');
  }
  return `${comps.slice(0, MAX_USED_BY).join(', ')}, +${comps.length - MAX_USED_BY} more`;
}

// ---- Markdown ----

function truncate(text, max) {
  return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text;
}
const cell = (text) => String(text).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const code = (text) => '`' + cell(text).replace(/`/g, "'") + '`';
const slug = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/ /g, '-');
const propAnchor = (name) => slug('prop-' + name);
const propLink = (name) => `[${code(name)}](#${propAnchor(name)})`;
const row = (cells) => `| ${cells.join(' | ')} |\n`;

const meaning = names.filter((name) => statusOf(name) === 'meaning');
const typed = names.filter((name) => statusOf(name) === 'type');
const declarations = components.reduce((sum, c) => sum + c.props.length, 0);

let md = `<!-- Generated by scripts/props-glossary.mjs (make props-glossary). Edit scripts/props-glossary.json, not this file. -->

# Props glossary

Every prop declared by the library's exported components, what it does, its type, and where the same name is used
with a different type or meaning. Variances last reviewed ${annotations.reviewed}.

## Scope and method

- **Source:** the TypeScript compiler, run over \`src/index.ts\` and every specialist entry point (\`src/*/index.ts\`).
  Every exported \`*Props\` type was read, plus exported components whose props are declared inline.
- **Own props only.** Props inherited from \`react-aria-components\`, \`react-aria\`, \`react-stately\`,
  \`@react-types/shared\` or React's DOM attributes are not listed one by one. The
  [component index](#component-index) says which components inherit from them.
- **Types** are shown as written in the source, so named aliases such as \`Tone\` or \`Size\` are kept. A \`|\` in a
  type is escaped as \`\\|\`. Long types are cut at ${MAX_TYPE_CHARS} characters; follow the component index to the source.
- **Descriptions** come from the JSDoc. Where a prop has none, or is shared by several components, a description was
  written from the source.
- **Variance** was judged by reading each shared prop's types, JSDoc and usage:
  - **meaning:** the same name does materially different things, or uses different units, on some components.
    AGENTS.md asks for a pre-existing prop name never to be reused for a different purpose, so these are the ones to
    look at.
  - **type:** the same purpose, but the TypeScript type differs between components.
  - blank: one type and one meaning everywhere.
- **Regenerate** with \`make props-glossary\`. Shared names added since the last review are marked _Unreviewed_; add
  them to \`scripts/props-glossary.json\`.

## Summary

| Measure | Count |
| --- | ---: |
`;
md += row(['Components and props types audited', components.length]);
md += row(['Prop declarations', declarations]);
md += row(['Distinct prop names', names.length]);
md += row(['Names used by more than one component', names.filter(isShared).length]);
md += row(['Names with a **meaning** variance', meaning.length]);
md += row(['Names with a **type** variance', typed.length]);
if (unreviewed.length) {
  md += row(['Shared names not yet reviewed', unreviewed.length]);
}

md += `\n### Most-used props\n\n| Prop | Components | Type | Variance |\n| --- | ---: | --- | --- |\n`;
const mostUsed = [...names]
  .sort((a, b) => usesByName.get(b).length - usesByName.get(a).length)
  .slice(0, 25);
for (const name of mostUsed) {
  const types = typeCounts(name);
  const status = statusOf(name);
  md += row([
    propLink(name),
    new Set(usesByName.get(name).map((use) => use.component)).size,
    types.length > 1 ? `${types.length} types` : code(truncate(types[0][0], 60)),
    status === 'consistent' ? '' : status,
  ]);
}

const varianceTable = (list) => {
  let table = `| Prop | Uses | How it varies |\n| --- | ---: | --- |\n`;
  for (const name of list) {
    table += row([propLink(name), usesByName.get(name).length, cell(varianceOf(name))]);
  }
  return table;
};

md += `\n## Variances\n\n### Meaning variances\n\n`;
md += `The same name, used for a different purpose or in different units. Candidates for renaming.\n\n`;
md += varianceTable(meaning);
md += `\n### Type variances\n\nThe same purpose, but a different TypeScript type on some components.\n\n`;
md += varianceTable(typed);
md += `\n### Near-duplicate names\n\nDifferent names for the same purpose. Not a conflict, but worth unifying.\n\n`;
md += `| Name | On | Same as | On | Purpose |\n| --- | --- | --- | --- | --- |\n`;
for (const dupe of annotations.nearDuplicates) {
  md += row([code(dupe.name), dupe.on, code(dupe.sameAs), dupe.sameAsOn, cell(dupe.purpose)]);
}

md += `\n## Glossary\n\n`;
md += `Alphabetical. **Req.** is whether the prop is required: yes, no, or mixed across components. Where a name has more\n`;
md += `than one type, the ${MAX_TYPES} most common are listed with the number of components using each.\n\n`;
const letterOf = (name) => name[0].toUpperCase();
const letters = [...new Set(names.map(letterOf))];
md += letters.map((letter) => `[${letter}](#${slug(letter)})`).join(' · ') + '\n';
for (const letter of letters) {
  md += `\n### ${letter}\n\n| Prop | Type | Req. | Description | Variance | Used by |\n| --- | --- | --- | --- | --- | --- |\n`;
  for (const name of names.filter((n) => letterOf(n) === letter)) {
    const types = typeCounts(name);
    const typeCell =
      types.length === 1
        ? code(truncate(types[0][0], MAX_TYPE_CHARS))
        : types
            .slice(0, MAX_TYPES)
            .map(([text, count]) => `${code(truncate(text, MAX_TYPE_CHARS))} (${count})`)
            .join('<br>') +
          (types.length > MAX_TYPES ? `<br>+${types.length - MAX_TYPES} more types` : '');
    const status = statusOf(name);
    const varianceCell =
      status === 'meaning'
        ? '[**meaning**](#meaning-variances)'
        : status === 'type'
          ? '[type](#type-variances)'
          : '';
    md += row([
      `<a id="${propAnchor(name)}"></a>${code(name)}`,
      typeCell,
      requiredOf(name),
      cell(descriptionOf(name)),
      varianceCell,
      cell(usedBy(name)),
    ]);
  }
}

md += `\n## Component index\n\n`;
md += `Each component's own props, grouped by entry point. **Bold** props are required. "Inherits" lists the libraries\n`;
md += `whose props the component also accepts.\n`;
const entryLabels = [...new Set(components.map((c) => c.entry))].sort((a, b) =>
  a === '.' ? -1 : b === '.' ? 1 : a.localeCompare(b),
);
for (const entry of entryLabels) {
  md += `\n### ${entry === '.' ? 'Main entry (`@centennial-oss/react-ux-core`)' : code(entry)}\n\n`;
  md += `| Component | Props type | Source | Own props | Inherits |\n| --- | --- | --- | --- | --- |\n`;
  const inEntry = components
    .filter((c) => c.entry === entry)
    .sort((a, b) => a.component.localeCompare(b.component));
  for (const c of inEntry) {
    const own =
      c.props.map((p) => (p.isOptional ? code(p.name) : `**${code(p.name)}**`)).join(', ') || '—';
    const inherits = [...new Set(c.inherited.map((pkg) => PACKAGE_LABELS[pkg] ?? pkg))].join(', ');
    const propsType = c.propsType ? code(c.propsType) + (c.isUnion ? ' (union)' : '') : 'inline';
    const source = `[${c.file.replace(/^src\//, '')}:${c.line}](../${c.file}#L${c.line})`;
    md += row([c.component, propsType, source, own, inherits]);
  }
}

// ---- Output ----

const staleShared = Object.keys(annotations.shared).filter(
  (name) => !usesByName.has(name) || !isShared(name),
);
const staleDescriptions = Object.keys(annotations.descriptions).filter(
  (name) => !usesByName.has(name),
);
if (!isQuiet) {
  if (unreviewed.length) {
    console.warn(
      `Shared prop names not yet reviewed in scripts/props-glossary.json: ${unreviewed.join(', ')}`,
    );
  }
  if (staleShared.length || staleDescriptions.length) {
    console.warn(
      `Entries in scripts/props-glossary.json that no longer match a shared prop: ${[...staleShared, ...staleDescriptions].join(', ')}`,
    );
  }
}

writeFileSync(OUT, md);
if (!isQuiet) {
  console.log(
    `Wrote docs/PROPS-GLOSSARY.md: ${components.length} components, ${names.length} prop names, ` +
      `${meaning.length} meaning and ${typed.length} type variances.`,
  );
}
