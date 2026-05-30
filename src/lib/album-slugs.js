// Album URL slugs (M23). English place-name slugs replace numeric album ids
// in URLs: /nepal/nagarkot-bhaktapur instead of /nepal/2.
//
// CANONICAL is the default URL for each album (keyed by post-merge album id;
// album 4 is merged into 3, so it has no entry). ALIASES are extra slugs that
// redirect to the canonical (single city → multi-city, etc.). Aliases are
// best-effort and must stay unique within a country (enforced by tests).
//
// Pure — no DOM, no fetch.

export const ALBUM_SLUGS = {
  // Nepal
  1: 'bangkok-kathmandu',
  2: 'nagarkot-bhaktapur',
  3: 'poon-hill-trek',
  5: 'pokhara-rafting',
  6: 'chitwan',
  7: 'kathmandu-return',
  // India
  8: 'delhi',
  9: 'kasar-devi',
  10: 'nainital',
  11: 'rishikesh',
  12: 'chandigarh',
  13: 'amritsar',
  14: 'bhagsu',
  15: 'manali',
  16: 'road-to-leh',
  17: 'leh',
  18: 'agra',
  // Thailand (early)
  19: 'bangkok',
  // Vietnam
  20: 'saigon-mekong-delta',
  21: 'mui-ne',
  22: 'dalat',
  23: 'central-highlands',
  24: 'nha-trang',
  25: 'hoi-an',
  26: 'hue',
  27: 'halong-bay',
  28: 'sapa',
  29: 'hanoi',
  // China
  30: 'chengdu',
  31: 'leshan-emeishan',
  32: 'huanglong',
  33: 'jiuzhaigou',
  34: 'yangshuo',
  35: 'dali',
  36: 'lijiang',
  37: 'kunming-bangkok-perth',
  // Australia
  38: 'kakadu',
  39: 'litchfield-darwin',
  40: 'cairns-cooktown',
  41: 'south-of-cairns',
  42: 'townsville-magnetic-island',
  43: 'airlie-beach',
  44: 'townsville-to-brisbane',
  45: 'brisbane',
  46: 'seaworld',
  47: 'gold-coast-sw-rocks',
  48: 'sydney',
  49: 'blue-mountains',
  50: 'ballarat',
  51: 'grampians',
  52: 'great-ocean-road',
  53: 'melbourne',
  // New Zealand
  54: 'auckland',
  55: 'north-of-auckland',
  56: 'helensville',
  57: 'coromandel',
  58: 'rotorua',
  59: 'taupo-tongariro',
  60: 'wellington',
  61: 'picton-nelson',
  62: 'abel-tasman',
  63: 'golden-bay',
  64: 'west-coast',
  65: 'glaciers',
  66: 'haast',
  67: 'wanaka',
  68: 'queenstown',
  69: 'te-anau',
  70: 'milford-sound',
  71: 'catlins',
  72: 'dunedin-otago-peninsula',
  73: 'oamaru',
  74: 'mount-cook',
  75: 'kaikoura',
  76: 'christchurch',
  // Thailand (late)
  77: 'bangkok-again',
  78: 'chiang-mai',
  79: 'pai',
  80: 'soppong',
  81: 'mae-hong-son',
  82: 'mae-sariang-mae-sot',
  83: 'sukhothai',
  84: 'khao-yai',
  85: 'koh-phangan',
  86: 'ranong',
  87: 'ao-nang',
  88: 'bangkok-final',
};

// Single-city / shorthand aliases that redirect to the canonical slug.
export const ALBUM_SLUG_ALIASES = {
  1: ['bangkok', 'kathmandu'],
  2: ['nagarkot', 'bhaktapur'],
  3: ['poon-hill'],
  5: ['pokhara'],
  20: ['saigon', 'mekong-delta'],
  31: ['leshan', 'emeishan'],
  37: ['kunming', 'perth'],
  39: ['litchfield', 'darwin'],
  40: ['cairns', 'cooktown'],
  42: ['townsville', 'magnetic-island'],
  43: ['great-barrier-reef'],
  47: ['gold-coast', 'sw-rocks'],
  59: ['taupo', 'tongariro'],
  61: ['picton', 'nelson'],
  72: ['dunedin', 'otago-peninsula'],
  82: ['mae-sariang', 'mae-sot'],
};

export function slugForAlbum(id) {
  return ALBUM_SLUGS[id] ?? null;
}

export function aliasesForAlbum(id) {
  return ALBUM_SLUG_ALIASES[id] ?? [];
}
