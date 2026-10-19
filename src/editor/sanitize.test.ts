import { describe, expect, it } from 'vitest';
import { googleDocsClipboard } from '../../test/googleDocs';
import { defaultEditorFeatures, resolveFeatures, type EditorFeature } from './features';
import { cleanHtml, isSafeImageSrc, isSafeUrl } from './sanitize';

const all = resolveFeatures(defaultEditorFeatures, 'html', true);
const only = (...features: EditorFeature[]) => resolveFeatures(features, 'html', true);

describe('cleanHtml', () => {
  it('keeps only allowed formatting from a Google Docs paste', () => {
    expect(cleanHtml(googleDocsClipboard, all)).toBe(
      [
        '<h2>Observing the Moon</h2>',
        '<p>The Moon is <strong>easiest</strong> to watch near the <em>terminator</em><u>, where shadows are long</u><s> (not at full moon)</s>1. Read the <a href="https://example.com/moon-guide">observing guide</a> and run <code>focus --auto</code>.</p>',
        '<ul>\n<li>Binoculars</li>\n<li><strong>A small telescope</strong></li>\n</ul>',
        '<table>\n<tbody>\n<tr><td><p><strong>Phase</strong></p></td><td><p><strong>Best for</strong></p></td></tr>\n<tr><td><p>First quarter</p></td><td><p>Craters</p></td></tr>\n</tbody>\n</table>',
        '<p><img alt="The Moon at first quarter" src="https://lh7-rt.googleusercontent.com/docsz/moon.png"></p>',
      ].join('\n'),
    );
  });

  it('drops formatting and blocks whose features are off', () => {
    expect(cleanHtml(googleDocsClipboard, only('italic'))).toBe(
      [
        '<p>Observing the Moon</p>',
        '<p>The Moon is easiest to watch near the <em>terminator</em>, where shadows are long (not at full moon)1. Read the observing guide and run focus --auto.</p>',
        '<p>Binoculars</p>',
        '<p>A small telescope</p>',
        '<p>Phase</p>',
        '<p>Best for</p>',
        '<p>First quarter</p>',
        '<p>Craters</p>',
      ].join('\n'),
    );
  });

  it('removes scripts, styles, event handlers and unsafe URLs', () => {
    const html = cleanHtml(
      '<p onclick="x()">Hi <a href="javascript:alert(1)">there</a> <a href=" https://example.com/a ">ok</a></p>' +
        '<img src="javascript:alert(1)" alt="bad"><iframe src="https://example.com"></iframe>' +
        '<script>alert(1)</script><style>p{}</style><svg><circle/></svg><p>end</p>',
      all,
    );
    expect(html).toBe('<p>Hi there <a href="https://example.com/a">ok</a></p>\n<p>end</p>');
  });

  it('normalises code blocks and checklists from other editors', () => {
    expect(
      cleanHtml(
        '<pre><code class="language-ts hljs"><span class="k">const</span> a = 1;\n<span>b</span></code></pre>' +
          '<ul><li aria-checked="true">done</li><li aria-checked="false">todo</li></ul>',
        all,
      ),
    ).toBe(
      '<pre><code class="language-ts">const a = 1;\nb</code></pre>\n' +
        '<ul class="contains-task-list">\n' +
        '<li class="task-list-item"><input checked disabled type="checkbox">done</li>\n' +
        '<li class="task-list-item"><input disabled type="checkbox">todo</li>\n</ul>',
    );
  });

  it('turns loose text and unknown wrappers into paragraphs, dropping blank lines', () => {
    expect(
      cleanHtml('Loose <b>text</b><br><br><section><div>One</div><div>Two</div></section>', all),
    ).toBe('<p>Loose <strong>text</strong></p>\n<p>One</p>\n<p>Two</p>');
  });

  it('keeps mentions only when mentions are on', () => {
    const mention = '<p>Hi <span data-mention-id="ada" style="color:red">@Ada</span></p>';
    expect(cleanHtml(mention, all)).toBe('<p>Hi <span data-mention-id="ada">@Ada</span></p>');
    expect(cleanHtml(mention, only('bold'))).toBe('<p>Hi @Ada</p>');
  });
});

describe('URL checks', () => {
  it('allows web, mail, phone and relative links only', () => {
    expect(isSafeUrl('https://example.com')).toBe(true);
    expect(isSafeUrl('mailto:ada@example.com')).toBe(true);
    expect(isSafeUrl('/docs#tides')).toBe(true);
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeUrl('data:text/html,hi')).toBe(false);
    expect(isSafeImageSrc('data:image/png;base64,AAAA')).toBe(true);
    expect(isSafeImageSrc('mailto:ada@example.com')).toBe(false);
  });
});
