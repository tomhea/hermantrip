// Ordered low→high source URLs for progressively loading a home tile's photo as
// a CSS background: a tiny thumb paints instantly, then card, then (desktop) the
// full-res hero. Phones pass includeHero:false to skip the heavy full-res step
// and save data. Pure — builds URLs via image-url.js (R6); main.js does the
// actual preload-then-swap on the DOM.
import { imageUrl } from './image-url.js';

export function progressiveChain(photoId, { dpr = 1, includeHero = true } = {}) {
  const chain = [
    imageUrl(photoId, 'thumb', { dpr }),
    imageUrl(photoId, 'card', { dpr }),
  ];
  if (includeHero) chain.push(imageUrl(photoId, 'hero', { dpr }));
  return chain;
}
