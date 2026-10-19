import { describe, expect, it } from 'vitest';
import { isMissingAlt, matchesAssetQuery, mediaAssetType, type MediaAsset } from './assets';
import { codeLanguageFor } from './fileSource';

const saturn: MediaAsset = {
  id: 's',
  name: 'saturn.png',
  url: 'https://example.com/saturn.png',
  type: 'image/png',
  alt: 'Saturn and its rings',
  tags: ['outer planets'],
};

describe('media assets', () => {
  it('groups files into the type filter’s families', () => {
    expect(mediaAssetType(saturn)).toBe('image');
    expect(mediaAssetType({ name: 'a.pdf', type: 'application/pdf' })).toBe('document');
    expect(mediaAssetType({ name: 'a.csv', type: 'text/csv' })).toBe('document');
    expect(mediaAssetType({ name: 'a.mp3', type: 'audio/mpeg' })).toBe('audio');
    expect(mediaAssetType({ name: 'a.webm', type: 'video/webm' })).toBe('video');
    expect(mediaAssetType({ name: 'a.zip', type: 'application/zip' })).toBeUndefined();
  });

  it('matches searches against the name, alt text and tags, and the type', () => {
    expect(matchesAssetQuery(saturn, { search: '' })).toBe(true);
    expect(matchesAssetQuery(saturn, { search: 'SATURN' })).toBe(true);
    expect(matchesAssetQuery(saturn, { search: 'rings' })).toBe(true);
    expect(matchesAssetQuery(saturn, { search: 'outer' })).toBe(true);
    expect(matchesAssetQuery(saturn, { search: 'mars' })).toBe(false);
    expect(matchesAssetQuery(saturn, { search: '', type: 'image' })).toBe(true);
    expect(matchesAssetQuery(saturn, { search: '', type: 'document' })).toBe(false);
  });

  it('flags images without alt text only', () => {
    expect(isMissingAlt(saturn)).toBe(false);
    expect(isMissingAlt({ ...saturn, alt: '  ' })).toBe(true);
    expect(isMissingAlt({ ...saturn, alt: undefined })).toBe(true);
    expect(
      isMissingAlt({ ...saturn, type: 'application/pdf', name: 'a.pdf', alt: undefined }),
    ).toBe(false);
  });

  it('picks a CodeBlock language for text previews', () => {
    expect(codeLanguageFor({ name: 'a.json', type: '' })).toBe('json');
    expect(codeLanguageFor({ name: 'a', type: 'application/x-yaml' })).toBe('yaml');
    expect(codeLanguageFor({ name: 'a.csv', type: 'text/csv' })).toBe('text');
  });
});
