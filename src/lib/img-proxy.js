// Pure logic for the same-origin image proxy (used by scripts/serve.mjs in
// dev and mirrored by deploy/Caddyfile in prod). Extracted so the routing
// is unit-testable without a running server or a network call — the gap
// that let "images don't load" ship undetected (the client emitted /img/
// URLs that nothing on the serving side was tested to honor).
//
//   parseImgPath('/img/{id}/{size}') -> { id, size } | null
//   lh3UrlFor(id, size)              -> the upstream Google URL to fetch
//
// `size` is a pixel width (digits) or the literal 'orig' (full original).

// Drive IDs are alphanumeric + `_` + `-`; size is digits or "orig". The
// anchored regex rejects path traversal, extra segments, and illegal id
// characters so nothing unsafe reaches the upstream fetch.
const IMG_PATH_RE = /^\/img\/([A-Za-z0-9_-]+)\/(\d+|orig)$/;

export function parseImgPath(pathname) {
  const m = pathname.match(IMG_PATH_RE);
  if (!m) return null;
  return { id: m[1], size: m[2] };
}

export function lh3UrlFor(id, size) {
  return size === 'orig'
    ? `https://lh3.googleusercontent.com/d/${id}=s0`
    : `https://lh3.googleusercontent.com/d/${id}=w${size}`;
}
