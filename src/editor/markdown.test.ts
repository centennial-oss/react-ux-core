import { $isCodeNode } from '@lexical/code';
import { $isLinkNode } from '@lexical/link';
import { $isListItemNode, $isListNode } from '@lexical/list';
import { $isHeadingNode, $isQuoteNode } from '@lexical/rich-text';
import { $isTableCellNode, $isTableNode, $isTableRowNode } from '@lexical/table';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  createEditor,
  type LexicalNode,
} from 'lexical';
import { describe, expect, it } from 'vitest';
import { articleImages, tidesArticle } from '../../test/editorArticle';
import { registerCodeHighlighting } from './codeHighlight';
import {
  defaultEditorFeatures,
  resolveFeatures,
  type EditorFeature,
  type EditorFormat,
} from './features';
import { createMarkdownTransformers } from './markdown';
import { nodesForFeatures } from './nodes';
import { $isDividerNode } from './nodes/DividerNode';
import { $isImageNode } from './nodes/ImageNode';
import { $createMentionNode } from './nodes/MentionNode';
import { $exportValue, $importValue, type EditorCodec } from './value';

function setup(format: EditorFormat, features: readonly EditorFeature[] = defaultEditorFeatures) {
  const resolved = resolveFeatures(features, format, true);
  const codec: EditorCodec = {
    format,
    features: resolved,
    transformers: createMarkdownTransformers(resolved),
  };
  const editor = createEditor({
    namespace: 'test',
    nodes: nodesForFeatures(resolved),
    onError: (error) => {
      throw error;
    },
  });
  registerCodeHighlighting(editor);
  const load = (value: string) => {
    if (format === 'json') {
      editor.setEditorState(editor.parseEditorState(value));
    } else {
      editor.update(
        () => {
          $importValue(editor, value, codec);
        },
        { discrete: true },
      );
    }
  };
  const save = () => editor.read(() => $exportValue(editor, codec));
  return { editor, codec, load, save };
}

function allNodes(): LexicalNode[] {
  const result: LexicalNode[] = [];
  const walk = (node: LexicalNode) => {
    result.push(node);
    if ($isElementNode(node)) {
      node.getChildren().forEach(walk);
    }
  };
  $getRoot().getChildren().forEach(walk);
  return result;
}

describe('Markdown round trip', () => {
  it('returns a 2,000-word article with headings, images, a table and code unchanged', () => {
    const { load, save } = setup('markdown');
    load(tidesArticle);
    expect(save()).toBe(tidesArticle);
  });

  it('reads every block of the article as the right node', () => {
    const { editor, load } = setup('markdown');
    load(tidesArticle);
    editor.read(() => {
      const nodes = allNodes();
      const headings = nodes.filter($isHeadingNode);
      expect(headings.map((heading) => heading.getTag())).toEqual([
        'h1',
        'h2',
        'h2',
        'h2',
        'h2',
        'h2',
        'h2',
        'h2',
        'h2',
        'h2',
      ]);
      expect(nodes.filter($isImageNode).map((image) => image.getSrc())).toEqual([
        articleImages.bulges,
        articleImages.springNeap,
        articleImages.io,
      ]);
      expect(nodes.filter($isImageNode).every((image) => image.getAlt().length > 10)).toBe(true);

      const tables = nodes.filter($isTableNode);
      expect(tables).toHaveLength(1);
      const rows = tables[0]?.getChildren().filter($isTableRowNode) ?? [];
      expect(rows).toHaveLength(6);
      expect(rows.every((row) => row.getChildren().filter($isTableCellNode).length === 4)).toBe(
        true,
      );
      expect(rows[0]?.getChildren().find($isTableCellNode)?.hasHeaderState(1)).toBe(true);

      const code = nodes.filter($isCodeNode);
      expect(code.map((block) => block.getLanguage())).toEqual(['python', 'json']);
      expect(code[0]?.getTextContent()).toContain('def tide_height(hours, mean_level=2.5):');

      const checklist = nodes.filter($isListNode).find((list) => list.getListType() === 'check');
      const items = checklist?.getChildren().filter($isListItemNode) ?? [];
      expect(items.map((item) => item.getChecked())).toEqual([true, true, false, false, false]);

      expect(nodes.filter($isQuoteNode)).toHaveLength(1);
      expect(nodes.filter($isDividerNode)).toHaveLength(1);
      expect(nodes.filter($isLinkNode).map((link) => link.getURL())).toEqual([
        'https://europa.nasa.gov/',
        'https://tidesandcurrents.noaa.gov/',
      ]);
    });
  });

  it('colours code blocks with the CodeBlock token types', () => {
    const { editor, load } = setup('markdown');
    load('```ts\nconst moons = 95; // Jupiter\n```');
    editor.read(() => {
      const types = allNodes()
        .filter((node) => node.getType() === 'code-highlight')
        .map((node) => [
          node.getTextContent(),
          (node as unknown as { getHighlightType(): string | undefined }).getHighlightType(),
        ]);
      expect(types).toContainEqual(['const', 'keyword']);
      expect(types).toContainEqual(['95', 'number']);
      expect(types).toContainEqual(['// Jupiter', 'comment']);
    });
  });

  it('survives Markdown → HTML → Markdown and Markdown → JSON → Markdown', () => {
    const markdown = setup('markdown');
    markdown.load(tidesArticle);

    const html = setup('html');
    const htmlValue = markdown.editor.read(() =>
      $exportValue(markdown.editor, { ...html.codec, transformers: markdown.codec.transformers }),
    );
    html.load(htmlValue);
    expect(html.save()).toBe(htmlValue);
    const backFromHtml = setup('markdown');
    backFromHtml.editor.setEditorState(html.editor.getEditorState());
    expect(backFromHtml.save()).toBe(tidesArticle);

    const json = setup('json');
    json.load(markdown.editor.read(() => $exportValue(markdown.editor, json.codec)));
    const backFromJson = setup('markdown');
    backFromJson.editor.setEditorState(json.editor.getEditorState());
    expect(backFromJson.save()).toBe(tidesArticle);
  });

  it('writes deterministic output: the same document always gives the same text', () => {
    const first = setup('json');
    const second = setup('json');
    const markdown = setup('markdown');
    markdown.load(tidesArticle);
    const value = markdown.editor.read(() => $exportValue(markdown.editor, first.codec));
    first.load(value);
    second.load(first.save());
    expect(second.save()).toBe(value);
    // Keys are sorted at every level.
    expect(value.indexOf('"children"')).toBeLessThan(value.indexOf('"direction"'));
  });

  it('escapes paragraph text that would read as another block', () => {
    const { editor, save, load } = setup('markdown');
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        for (const text of [
          '# not a heading',
          '- not a list',
          '1. not ordered',
          '> not a quote',
          '---',
        ]) {
          root.append($createParagraphNode().append($createTextNode(text)));
        }
      },
      { discrete: true },
    );
    const value = save();
    expect(value).toBe(
      '\\# not a heading\n\n\\- not a list\n\n1\\. not ordered\n\n\\> not a quote\n\n\\---',
    );
    load(value);
    expect(save()).toBe(value);
    editor.read(() => {
      expect(
        $getRoot()
          .getChildren()
          .every((node) => node.getType() === 'paragraph'),
      ).toBe(true);
    });
  });

  it('writes mentions as "@label"', () => {
    const { editor, save } = setup('markdown');
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        root.append(
          $createParagraphNode().append(
            $createTextNode('Thanks '),
            $createMentionNode('ada', 'Ada Lovelace'),
            $createTextNode(' for the *notes*'),
          ),
        );
      },
      { discrete: true },
    );
    expect(save()).toBe('Thanks @Ada Lovelace for the \\*notes\\*');
  });

  it('reads only the syntax of the features that are on', () => {
    const { editor, load, save } = setup('markdown', ['bold', 'list']);
    load('# Title\n\n**bold** and *italic*\n\n- item\n\n| a | b |\n| --- | --- |\n| 1 | 2 |');
    editor.read(() => {
      expect(allNodes().some($isHeadingNode)).toBe(false);
      expect(allNodes().some($isTableNode)).toBe(false);
      expect(allNodes().some($isListNode)).toBe(true);
    });
    expect(save()).toContain('**bold** and \\*italic\\*');
  });

  it('writes an empty document as an empty string', () => {
    const { load, save } = setup('markdown');
    load('');
    expect(save()).toBe('');
  });
});
