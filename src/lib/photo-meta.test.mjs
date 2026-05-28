import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { extractPhotoMeta } from './photo-meta.js';

test('extractPhotoMeta — full record with EXIF', () => {
  const driveFile = {
    id: '1abc123',
    name: 'IMG_001.jpg',
    mimeType: 'image/jpeg',
    thumbnailLink: 'https://lh3.googleusercontent.com/foo=s220',
    modifiedTime: '2023-07-22T08:00:00.000Z',
    imageMediaMetadata: {
      time: '2022:11:15 14:32:08',
      width: 4000,
      height: 3000,
    },
  };
  const out = extractPhotoMeta(driveFile);
  assert.equal(out.id, '1abc123');
  assert.equal(out.name, 'IMG_001.jpg');
  assert.equal(out.mimeType, 'image/jpeg');
  assert.equal(out.thumbnailLink, 'https://lh3.googleusercontent.com/foo=s220');
  assert.equal(out.mtime, '2023-07-22T08:00:00.000Z');
  assert.equal(out.capturedAt, '2022-11-15T14:32:08');
});

test('extractPhotoMeta — missing EXIF leaves capturedAt null', () => {
  const driveFile = {
    id: '1abc',
    name: 'scan.jpg',
    mimeType: 'image/jpeg',
    thumbnailLink: 'https://lh3.googleusercontent.com/foo=s220',
    modifiedTime: '2023-07-22T08:00:00.000Z',
    // No imageMediaMetadata at all.
  };
  const out = extractPhotoMeta(driveFile);
  assert.equal(out.capturedAt, null);
  assert.equal(out.mtime, '2023-07-22T08:00:00.000Z');
});

test('extractPhotoMeta — imageMediaMetadata present but no time', () => {
  const driveFile = {
    id: '1xyz',
    name: 'img.jpg',
    mimeType: 'image/jpeg',
    modifiedTime: '2023-07-22T08:00:00.000Z',
    imageMediaMetadata: { width: 100, height: 100 }, // no `time`
  };
  const out = extractPhotoMeta(driveFile);
  assert.equal(out.capturedAt, null);
});

test('extractPhotoMeta — malformed EXIF time string leaves capturedAt null', () => {
  const driveFile = {
    id: '1bad',
    name: 'img.jpg',
    mimeType: 'image/jpeg',
    modifiedTime: '2023-07-22T08:00:00.000Z',
    imageMediaMetadata: { time: 'garbage' },
  };
  const out = extractPhotoMeta(driveFile);
  assert.equal(out.capturedAt, null);
});

test('extractPhotoMeta — preserves thumbnailLink even when undefined-ish', () => {
  // Drive omits thumbnailLink for some non-image files; manifest tolerates
  // null since the lh3 URL is the primary path.
  const driveFile = {
    id: '1',
    name: 'foo.jpg',
    mimeType: 'image/jpeg',
    modifiedTime: '2023-01-01T00:00:00.000Z',
  };
  const out = extractPhotoMeta(driveFile);
  assert.equal(out.thumbnailLink ?? null, null);
});
