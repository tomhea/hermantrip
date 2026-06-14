// Per-country hero photo override for the home tiles (user-curated, M63.1).
// Maps a country code → a chosen Drive photo id. The home tile prefers this
// hand-picked photo; if a country is missing here it falls back to
// pickCountryThumb's automatic choice. Pure data — no DOM/fetch (R6).
export const COUNTRY_HERO = {
  np: '16DqP-_p-5BBVvxrnRlwX3pyy9ZaT7ZTS',
  in: '1ZadCUDFTHhLo-8x1H_s_4VrdStpXJiWI',
  vn: '1fRhYylOx2idASjiZC0SyuRCHnbMRwpE2',
  cn: '1bhmTvhLmc6NKmgJyvs7a1amxVL-IkUGY',
  au: '1v9XzgDbdnxiwKzjYtsc0_-jazPifRr_P',
  nz: '1nSyPRf281jERRmUEiXPdyBly2xvOZ4h7',
  th: '1VEvFOdj0KbUN_0UYib_uW0pM4LsSR4cO',
};

export function heroPhotoId(code) {
  return COUNTRY_HERO[code] ?? null;
}
