/**
 * Maps Roku app / input names to crisp brand logos bundled in
 * public/icons/brands. Logos come from selfh.st/icons (CC BY 4.0), with
 * gaps filled from Simple Icons (CC0, files prefixed `si-`).
 *
 * `dark: true` means the regular logo is dark-on-transparent, so a white
 * `-light.svg` variant is used on the dark theme instead.
 *
 * Rules are checked in order, so put specific names ("YouTube TV") before
 * general ones ("YouTube"). To add a brand: drop its SVG into
 * public/icons/brands and add a line here.
 */
type Brand = { slug: string; match: RegExp; dark?: boolean };

const BRANDS: Brand[] = [
  { slug: "si-youtubetv", match: /youtube ?tv/i },
  { slug: "youtube", match: /youtube/i },
  { slug: "netflix", match: /netflix/i },
  { slug: "plex", match: /\bplex\b/i },
  { slug: "jellyfin", match: /jellyfin/i },
  { slug: "emby", match: /\bemby\b/i },
  { slug: "kodi", match: /\bkodi\b/i },
  { slug: "channels-dvr", match: /channels ?dvr/i },
  { slug: "disney-plus", match: /disney/i, dark: true },
  { slug: "hulu", match: /\bhulu\b/i },
  { slug: "hbo-max", match: /hbo ?max/i, dark: true },
  { slug: "si-hbo", match: /\bhbo\b/i, dark: true },
  { slug: "max", match: /^max\b/i, dark: true },
  { slug: "amazon-prime-video", match: /prime ?video|amazon (prime|video)/i },
  { slug: "amazon-music", match: /amazon music/i },
  { slug: "peacock", match: /peacock/i, dark: true },
  { slug: "paramount-plus", match: /paramount/i },
  { slug: "apple-tv", match: /apple ?tv/i, dark: true },
  { slug: "apple-music", match: /apple music/i },
  { slug: "twitch", match: /twitch/i },
  { slug: "crunchyroll", match: /crunchyroll/i },
  { slug: "fubotv", match: /\bfubo/i },
  { slug: "si-tubi", match: /\btubi\b/i },
  { slug: "si-roku", match: /roku/i, dark: true },
  { slug: "si-starz", match: /starz/i, dark: true },
  { slug: "si-mubi", match: /\bmubi\b/i, dark: true },
  { slug: "si-mlb", match: /\bmlb\b/i, dark: true },
  { slug: "si-nba", match: /\bnba\b/i, dark: true },
  { slug: "si-nhl", match: /\bnhl\b/i, dark: true },
  { slug: "skyshowtime", match: /skyshowtime/i, dark: true },
  { slug: "dazn", match: /\bdazn\b/i, dark: true },
  { slug: "spotify", match: /spotify/i },
  { slug: "pandora", match: /pandora/i },
  { slug: "iheartradio", match: /iheart/i },
  { slug: "tidal", match: /\btidal\b/i, dark: true },
  { slug: "deezer", match: /deezer/i },
  { slug: "soundcloud", match: /soundcloud/i },
  { slug: "audible", match: /audible/i },
  { slug: "vimeo", match: /vimeo/i },
  { slug: "fandango", match: /fandango|vudu/i },
  { slug: "facebook", match: /facebook/i },
  { slug: "zoom", match: /\bzoom\b/i },
  // Common things plugged into HDMI inputs (Roku lets you rename inputs).
  { slug: "nintendo-switch", match: /switch|nintendo/i },
  { slug: "playstation", match: /playstation|\bps[345]\b/i },
  { slug: "xbox", match: /xbox/i },
  { slug: "steam-deck", match: /steam ?deck/i, dark: true },
  { slug: "steam", match: /steam/i },
  { slug: "apple", match: /\bmac(book|mini| studio)?\b|imac|apple/i, dark: true },
];

export type BrandIcon = { light: string; dark: string };

const cache = new Map<string, BrandIcon | null>();

export function brandFor(name: string | null | undefined): BrandIcon | null {
  if (!name) return null;
  if (cache.has(name)) return cache.get(name)!;
  const brand = BRANDS.find((b) => b.match.test(name));
  const result = brand
    ? {
        light: `/icons/brands/${brand.slug}.svg`,
        dark: `/icons/brands/${brand.slug}${brand.dark ? "-light" : ""}.svg`,
      }
    : null;
  cache.set(name, result);
  return result;
}

/** Brand slugs offered in the automation icon picker. */
export const PICKER_BRANDS = [
  "youtube", "netflix", "plex", "jellyfin", "disney-plus", "hulu", "max",
  "amazon-prime-video", "peacock", "paramount-plus", "apple-tv", "twitch",
  "spotify", "crunchyroll", "nintendo-switch", "playstation", "xbox", "steam",
];

const DARK_SLUGS = new Set(BRANDS.filter((b) => b.dark).map((b) => b.slug));

export function brandBySlug(slug: string): BrandIcon {
  return {
    light: `/icons/brands/${slug}.svg`,
    dark: `/icons/brands/${slug}${DARK_SLUGS.has(slug) ? "-light" : ""}.svg`,
  };
}
