/**
 * Videos that also ship as AV1 (`<name>.av1.mp4` beside the H.264 file).
 *
 * AV1 is a third to a half smaller at the same picture, so browsers that
 * decode it (Chrome, Edge, Firefox, Android, recent Apple hardware) start
 * playback sooner. Each AV1 file scored VMAF 96 or higher against its H.264
 * original and is listed only if it saved at least 15%. Everyone else gets
 * the H.264 file, unchanged.
 */
const AV1: ReadonlySet<string> = new Set<string>([
  "/fleet/bentley-bentayga/film.mp4",
  "/fleet/bmw-i8-roadster/film.mp4",
  "/fleet/cadillac-escalade-iq/film.mp4",
  "/fleet/cadillac-escalade-sport-platinum/film.mp4",
  "/fleet/chevrolet-corvette-c8-stingray/film.mp4",
  "/fleet/chevrolet-corvette-c8-white/film.mp4",
  "/fleet/dodge-challenger-srt-hellcat/film.mp4",
  "/fleet/jeep-wrangler-unlimited/film.mp4",
  "/fleet/lamborghini-urus/film.mp4",
  "/fleet/lexus-lc-500-convertible/film.mp4",
  "/fleet/maserati-levante/film.mp4",
  "/fleet/mclaren-gt/film.mp4",
  "/fleet/mercedes-amg-gt-43/film.mp4",
  "/fleet/mercedes-benz-s-580/film.mp4",
  "/fleet/mercedes-benz-s-580/reel.mp4",
  "/fleet/mercedes-benz-s-class/film.mp4",
  "/fleet/mercedes-maybach-gls/film.mp4",
  "/fleet/porsche-macan/film.mp4",
  "/fleet/porsche-macan/reel.mp4",
  "/fleet/range-rover-autobiography/film.mp4",
  "/fleet/rolls-royce-cullinan-black-badge/film.mp4",
  "/fleet/rolls-royce-wraith/film.mp4",
  "/media/about/exotic.mp4",
  "/media/about/luxury.mp4",
  "/media/about/partners.mp4",
  "/media/about/rewards.mp4",
  "/media/nxl-how-01.mp4",
  "/media/nxl-miami-aerial.mp4",
  "/media/nxl-storefront-02.mp4",
  "/media/pages/partners.mp4",
  "/media/pages/subscriptions.mp4",
  "/media/pages/who-we-are.mp4",
  "/media/reels/corvette-white-interior.mp4",
]);

const AV1_TYPE = 'video/mp4; codecs="av01.0.08M.08"';

/** `<source>` entries for a clip, smallest format first. */
export function videoSources(src: string): { src: string; type: string }[] {
  const h264 = { src, type: "video/mp4" };
  return AV1.has(src) ? [{ src: src.replace(/\.mp4$/, ".av1.mp4"), type: AV1_TYPE }, h264] : [h264];
}
