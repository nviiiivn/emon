// Live video sources: the owner's edit point for the Live Webcams wall and the Live News channels.
//
// An entry can be any of:
//   - a YouTube watch, live, embed or youtu.be URL, or a bare 11-character video id
//   - a channel URL, youtube.com/channel/UC... (plays whatever that channel has live right now)
//   - an https .m3u8 stream URL
// Entries are tried in order until one is verified live. Dead, ended and unembeddable entries are
// skipped and never shown as live. An empty list [] means the slot needs a feed: the dashboard
// hides it and the audit lists it.
//
// Check a candidate before pasting it:
//   npm run live-video:check -- https://www.youtube.com/watch?v=...
// Check what a slot plays today, or every slot:
//   npm run live-video:check -- --slot webcams/kyiv
//   npm run live-video:check -- --slot live-news/cnn
//   npm run live-video:check -- --all
//
// A daily audit (.github/workflows/live-video-source-audit.yml) keeps one GitHub issue, "Live video
// sources: slots needing a replacement": each slot with nothing live, and each empty slot viewers
// would see, with where it shows and why. Empty slots the dashboard hides are listed separately and
// never keep the issue open. To fix a slot, check a candidate with the first command above, paste the
// line it prints after `paste:` into that slot's list below, and the next run drops the slot from the
// issue. The issue closes itself once no slot needs attention.
//
// A channel entry also opts the slot into live video refresh. The audit reads the channel's /live page and
// checks the video the channel has live right now instead of the channel embed; when that video is missing
// from the slot and a pinned video sits ahead of the channel, the issue shows it under "Live now", ready to
// paste over the dead pinned entry. The dashboard (#8545) tries the video the seed-live-video-resolved cron last
// found live on the channel immediately before that channel entry, so entries ahead of the channel keep priority;
// when that video is missing, older than 36 hours or slow to arrive, it plays this list unchanged. For a broadcaster that restarts its stream under
// a new id, list only the channel, with no pinned id. Do not list a channel whose featured live is another
// stream (a side camera, a press conference, a replay): the resolved video would be that stream.
// The seed-live-video-resolved cron reads its channel list from
// scripts/shared/live-video-refresh-channels.generated.json: after adding, moving or removing a channel entry,
// run `npm run sync:live-video-channels` (CI fails until the generated list matches this file).

export const WEBCAM_SOURCES = {
  jerusalem: ['https://www.youtube.com/watch?v=zp6LNSoq000'],
  'middle-east': ['https://www.youtube.com/watch?v=AkqGOcpDvZU'],
  'tel-aviv': [],
  // The broadcaster's own channel stream; ju3cuAIc1i4 began failing with player error 150 (#8284).
  mecca: ['https://www.youtube.com/watch?v=eC4LfEVxvKg'],
  istanbul: ['https://www.youtube.com/watch?v=bbVe5h7X3uw'],
  medina: ['https://www.youtube.com/watch?v=naaOMgZbIHQ'],
  // MTV Lebanon News' channel embed (youtube.com/channel/UC9_XmAwE5szLHF76FjMylaw) returned player
  // error 150 on 2026-09-15; paste it back once the checker reports it live.
  'beirut-mtv': [],
  // Rotates through Kyiv, Odesa, Kharkiv, Kramatorsk, Sloviansk, Donetsk and Dnipro.
  kyiv: ['https://www.youtube.com/watch?v=e2gC37ILQmk'],
  paris: ['https://www.youtube.com/watch?v=-xzg3wujOVM'],
  'st-petersburg': ['https://www.youtube.com/watch?v=CjtIYbmVfck'],
  london: ['https://www.youtube.com/watch?v=zMCea32gpmg'],
  washington: ['https://www.youtube.com/watch?v=oDCAAfOSqvA'],
  'new-york': ['https://www.youtube.com/watch?v=JQ_jwk_7OVE', 'https://www.youtube.com/watch?v=VGnFLdQW39A'],
  'los-angeles': ['https://www.youtube.com/watch?v=EO_1LWqsCNE'],
  // No official city or port cam exists, so these are established webcam operators: ZeroEight on South
  // Beach, World Live Cams on Sunny Isles, Ryan Rea on PortMiami. nPGlLfGX6SA failed with player error 150
  // (2026-09-23, #8545).
  miami: [
    'https://www.youtube.com/watch?v=WT69M210Z18',
    'https://www.youtube.com/watch?v=bi7B4EmyHHs',
    'https://www.youtube.com/watch?v=4fzzp0XVPoA',
  ],
  taipei: ['https://www.youtube.com/watch?v=z_fY1pj1VBw'],
  shanghai: ['https://www.youtube.com/watch?v=Z-g8M1QGKbg'],
  tokyo: ['https://www.youtube.com/watch?v=_k-5U7IeK8g'],
  seoul: ['https://www.youtube.com/watch?v=vk5BHoDxXf0'],
  sydney: ['https://www.youtube.com/watch?v=5uZa3-RMFos'],
  'iss-earth': ['https://www.youtube.com/watch?v=M3HKLzjvKPc'],
  // NASA's official "Live High-Definition Views from the International Space Station".
  'nasa-live': ['https://www.youtube.com/watch?v=awQzjn72bI0'],
  // NASASpaceflight's Starbase Live, then its Space Coast Live. Dream Trips' ISS stream
  // (0FBiyFpV__g) was requested but does not allow embedding (player error 150, 2026-09-15).
  'space-x': ['https://www.youtube.com/watch?v=mhJRzQsLZGg', 'https://www.youtube.com/watch?v=Jm8wRjD3xVA'],
  'space-walk': ['https://www.youtube.com/watch?v=fO9e9jnhYK8'],
  // nvii self-host (2026-11-19): San Francisco, Oakland and Seattle cams - city, campus, beach,
  // airport and public traffic cams (Caltrans D4 and Seattle DOT HLS streams). Later entries are fallbacks.
  'sf-golden-gate': ['https://www.youtube.com/watch?v=uoIfETBzuSU'],
  'sf-downtown': ['https://www.youtube.com/watch?v=G8RIAgPxaMc'],
  'sf-bay-bridge': ['https://wzmedia.dot.ca.gov/D4/E80_at_SAS_Tower.stream/playlist.m3u8', 'https://wzmedia.dot.ca.gov/D4/W80_at_Fremont_St_Ofr.stream/playlist.m3u8'],
  'sf-pier-39': ['https://www.youtube.com/watch?v=UCQivLGCx9c'],
  'sf-pier-23': ['https://www.youtube.com/watch?v=PDKGik7Np88'],
  'sf-bay-view': ['https://www.youtube.com/watch?v=BSWhGNXxT9A'],
  'sf-sfo': ['https://www.youtube.com/watch?v=sTVM6Sc80X0'],
  'sf-pacifica': ['https://www.youtube.com/watch?v=3vqiXAw1Km4', 'https://www.youtube.com/watch?v=lmec_rcEIL4'],
  'sf-mori-point': ['https://www.youtube.com/watch?v=iQ7XJDXYSMo'],
  'sf-101-octavia': ['https://wzmedia.dot.ca.gov/D4/S101_at_Octavia_St.stream/playlist.m3u8'],
  'sf-presidio': ['https://wzmedia.dot.ca.gov/D4/N1_at_Presidio_Tunnel.stream/playlist.m3u8'],
  'sf-i80-6th': ['https://wzmedia.dot.ca.gov/D4/E80_at_6th_St.stream/playlist.m3u8'],
  'sf-candlestick': ['https://wzmedia.dot.ca.gov/D4/N101_at_Candlestick_Park.stream/playlist.m3u8'],
  'oak-bay-bridge': ['https://www.youtube.com/watch?v=CXYr04BWvmc'],
  'oak-lake-merritt': ['https://wzmedia.dot.ca.gov/D4/E580_at_Grand_Lakeshore.stream/playlist.m3u8'],
  'oak-vollmer': ['https://www.youtube.com/watch?v=FLoSUN_Vrz4'],
  'oak-telegraph': ['https://wzmedia.dot.ca.gov/D4/W24_at_Telegraph.stream/playlist.m3u8', 'https://wzmedia.dot.ca.gov/D4/W24_JEO_JCT_980.stream/playlist.m3u8'],
  'oak-treasure-island': ['https://www.youtube.com/watch?v=_VqvVJfmyfs'],
  'oak-bridge-incline': ['https://wzmedia.dot.ca.gov/D4/W80_at_SFOBB_Incline.stream/playlist.m3u8'],
  'oak-webster-tube': ['https://wzmedia.dot.ca.gov/D4/W260_WEBSTER_ST_TUNNEL_ENTRANCE.stream/playlist.m3u8'],
  'oak-580-high': ['https://wzmedia.dot.ca.gov/D4/E580_at_High_St.stream/playlist.m3u8', 'https://wzmedia.dot.ca.gov/D4/W580_at_35th_Av.stream/playlist.m3u8'],
  'oak-berkeley-albany': ['https://www.youtube.com/watch?v=rJ56Y-G4Wco'],
  'oak-gilman': ['https://wzmedia.dot.ca.gov/D4/W80_at_Gilman_St.stream/playlist.m3u8'],
  'oak-emeryville': ['https://wzmedia.dot.ca.gov/D4/N123_at_40th_St_West_View.stream/playlist.m3u8'],
  'sea-pike': ['https://61e0c5d388c2e.streamlock.net/live/2_Pike_NS.stream/playlist.m3u8'],
  'sea-waterfront': ['https://61e0c5d388c2e.streamlock.net/live/Alaskan_Spring.stream/playlist.m3u8'],
  'sea-uw-lake': ['https://www.youtube.com/watch?v=NCzKkn0wD30'],
  'sea-center': ['https://61e0c5d388c2e.streamlock.net/live/5_Mercer_NS.stream/playlist.m3u8'],
  'sea-uw-campus': ['https://www.youtube.com/watch?v=9-hGCRgqMMs'],
  'sea-airport': ['https://www.youtube.com/watch?v=Ila-kU9I_Nk'],
  'sea-city-tv': ['https://www.youtube.com/watch?v=hV8qIEYw54U'],
  'sea-aquarium': ['https://www.youtube.com/watch?v=NqOmHpwMUxs'],
  'sea-5-pike': ['https://61e0c5d388c2e.streamlock.net/live/5_Pike_NS.stream/playlist.m3u8'],
  'sea-pioneer': ['https://61e0c5d388c2e.streamlock.net/live/Alaskan_Yesler_NS.stream/playlist.m3u8'],
  'sea-westlake': ['https://61e0c5d388c2e.streamlock.net/live/Westlake_Denny_NS.stream/playlist.m3u8'],
  'sea-west-seattle': ['https://61e0c5d388c2e.streamlock.net/live/Harbor_SW_Spokane_EW.stream/playlist.m3u8'],
  'sea-queen-anne': ['https://61e0c5d388c2e.streamlock.net/live/QAnne_N_Mercer_EW.stream/playlist.m3u8'],
  // nvii self-host (2026-11-19): Miami, Florida Keys, Caribbean, NYC, DC area (Maryland DOT HLS), Chicago.
  'mia-skyline': ['https://www.youtube.com/watch?v=GkBMgHwSIV0'],
  'mia-south-beach': ['https://www.youtube.com/watch?v=NHv3lZ7eYt8'],
  'mia-port': ['https://www.youtube.com/watch?v=m1R-LmvVt30'],
  'mia-river': ['https://www.youtube.com/watch?v=FHzIIYECzmM'],
  'mia-airport': ['https://www.youtube.com/watch?v=_GUsXnlVJmo', 'https://www.youtube.com/watch?v=q2Dxx5704fQ'],
  'mia-sunny-isles': ['https://www.youtube.com/watch?v=H91O7OQudcc'],
  'mia-hollywood': ['https://www.youtube.com/watch?v=cmkAbDUEoyA'],
  'keys-duval': ['https://www.youtube.com/watch?v=GYEdeLtxz6c', 'https://www.youtube.com/watch?v=lcVm-Izrpa0'],
  'keys-harbor': ['https://www.youtube.com/watch?v=iHJbTrQSZys'],
  'keys-cruise': ['https://www.youtube.com/watch?v=8Rw-tZTeBjU'],
  'keys-bight': ['https://www.youtube.com/watch?v=Y5ypYTZs-7o'],
  'keys-fort-zach': ['https://www.youtube.com/watch?v=lxaM_gmYz_o'],
  'keys-islamorada': ['https://www.youtube.com/watch?v=zfSst64NFcE', 'https://www.youtube.com/watch?v=8ShFKuTCmhQ'],
  'keys-key-largo': ['https://www.youtube.com/watch?v=W01huIwqSEo'],
  'car-san-juan': ['https://www.youtube.com/watch?v=taI7GiyvDxE'],
  'car-maho': ['https://www.youtube.com/watch?v=2IQmpCXbOmM', 'https://www.youtube.com/watch?v=iSeH45R-8R0'],
  'car-cayman': ['https://www.youtube.com/watch?v=ngTSRF7Co2c'],
  'car-aruba': ['https://www.youtube.com/watch?v=_ZXMjk5K0_s'],
  'car-curacao': ['https://www.youtube.com/watch?v=28U-t3fA9ks', 'https://www.youtube.com/watch?v=loHbMM9JfCs'],
  'car-bvi': ['https://www.youtube.com/watch?v=V_I168MM-ik'],
  'nyc-times-sq': ['https://www.youtube.com/watch?v=ZxCeWQ3Lcig', 'https://www.youtube.com/watch?v=KHy_n-EMWY8'],
  'nyc-fox5': ['https://www.youtube.com/watch?v=VGnFLdQW39A'],
  'nyc-brooklyn-bridge': ['https://www.youtube.com/watch?v=1kvGNR_A3DY'],
  'nyc-bryant-park': ['https://www.youtube.com/watch?v=hMWSUCXkj6w'],
  'nyc-vanderbilt': ['https://www.youtube.com/watch?v=2_PDaUJbfuI'],
  'nyc-broadway': ['https://www.youtube.com/watch?v=VXo0VqVcbK4'],
  'nyc-surveillance': ['https://www.youtube.com/watch?v=mkX71WMAmNI'],
  'dc-md-1': ['https://strmr5.sha.maryland.gov/rtplive/a1008d3b00020075004d823633235daa/playlist.m3u8'],
  'dc-md-2': ['https://strmr5.sha.maryland.gov/rtplive/f70054e703e00077004d823633235daa/playlist.m3u8'],
  'dc-md-3': ['https://strmr5.sha.maryland.gov/rtplive/ae01694b01220075004d823633235daa/playlist.m3u8'],
  'dc-md-4': ['https://strmr5.sha.maryland.gov/rtplive/8c00118a004b00a0004e3536c4235c0a/playlist.m3u8'],
  'dc-md-5': ['https://strmr5.sha.maryland.gov/rtplive/c0000328018c0055005dd336c4235c0a/playlist.m3u8'],
  'dc-md-6': ['https://strmr5.sha.maryland.gov/rtplive/0601f50e012b0075004d823633235daa/playlist.m3u8'],
  'dc-md-7': ['https://strmr5.sha.maryland.gov/rtplive/6900ed9d0021000a005ed336c4235c0a/playlist.m3u8'],
  'dc-md-8': ['https://strmr5.sha.maryland.gov/rtplive/0b01b57900060075004d823633235daa/playlist.m3u8'],
  'dc-md-9': ['https://strmr3.sha.maryland.gov/rtplive/a800e67c000b0089005cd336c4235c0a/playlist.m3u8'],
  'dc-md-10': ['https://strmr5.sha.maryland.gov/rtplive/9d00119e00770051004de33696235daa/playlist.m3u8'],
  'dc-md-11': ['https://strmr5.sha.maryland.gov/rtplive/3301a05801f700d700437a45351f0214/playlist.m3u8'],
  'dc-md-12': ['https://strmr5.sha.maryland.gov/rtplive/efff918500020075004d823633235daa/playlist.m3u8'],
  'chi-skydeck': ['https://www.youtube.com/watch?v=O0UGT7AT3aw'],
  'chi-ohare': ['https://www.youtube.com/watch?v=G34jYcWBmnE'],
  'chi-midway': ['https://www.youtube.com/watch?v=67BCsiW-1Io'],
  'chi-rail': ['https://www.youtube.com/watch?v=DcbDohUnv6c'],
  // nvii self-host (2026-11-19): LA and Santa Cruz.
  'la-hollywood': ['https://www.youtube.com/watch?v=YHWJd_DNgKY'],
  'la-venice': ['https://www.youtube.com/watch?v=EO_1LWqsCNE', 'https://www.youtube.com/watch?v=98jOtUeM3m8'],
  'la-santa-monica': ['https://www.youtube.com/watch?v=v97JpT3ZA0w'],
  'la-malibu': ['https://www.youtube.com/watch?v=E0TZTmTK-Ws'],
  'la-lax': ['https://www.youtube.com/watch?v=9qs8ERnANBw', 'https://www.youtube.com/watch?v=n4I0d44oBEs'],
  'la-101-hollywood': ['https://wzmedia.dot.ca.gov/D7/CCTV-607.stream/playlist.m3u8', 'https://wzmedia.dot.ca.gov/D7/CCTV-609.stream/playlist.m3u8', 'https://wzmedia.dot.ca.gov/D7/CCTV-605.stream/playlist.m3u8', 'https://wzmedia.dot.ca.gov/D7/CCTV-606.stream/playlist.m3u8'],
  'la-downtown': ['https://wzmedia.dot.ca.gov/D7/CCTV-595.stream/playlist.m3u8', 'https://wzmedia.dot.ca.gov/D7/CCTV-594.stream/playlist.m3u8', 'https://wzmedia.dot.ca.gov/D7/CCTV-156.stream/playlist.m3u8'],
  'la-5-10': ['https://wzmedia.dot.ca.gov/D7/CCTV-17.stream/playlist.m3u8', 'https://wzmedia.dot.ca.gov/D7/CCTV-2.stream/playlist.m3u8'],
  'la-405-lax': ['https://wzmedia.dot.ca.gov/D7/CCTV-359.stream/playlist.m3u8', 'https://wzmedia.dot.ca.gov/D7/CCTV-301.stream/playlist.m3u8'],
  'sc-ocean-st': ['https://wzmedia.dot.ca.gov/D5/17atOceanSt.stream/playlist.m3u8'],
  'sc-hwy17': ['https://wzmedia.dot.ca.gov/D5/17atPasatiempoDr.stream/playlist.m3u8', 'https://wzmedia.dot.ca.gov/D5/17atLaurelRd.stream/playlist.m3u8'],
  'sc-41st': ['https://wzmedia.dot.ca.gov/D5/1atWof41stAve.stream/playlist.m3u8'],
  'sc-morrissey': ['https://wzmedia.dot.ca.gov/D5/1atEastofMorriseyBlvd.stream/playlist.m3u8', 'https://wzmedia.dot.ca.gov/D5/1atWofMorriseyBlvd.stream/playlist.m3u8'],
  'sc-monterey-bay': ['https://www.youtube.com/watch?v=fVa6-zCBR7A'],
  'sc-surf': ['https://www.youtube.com/watch?v=hm9iAviOZ20'],
} as const satisfies Record<string, readonly string[]>;

export type WebcamSlotId = keyof typeof WEBCAM_SOURCES;

/** The "all regions" wall: the first four slots here that have entries. A filled hotspot slot moves back to the front. */
export const WEBCAM_GRID_PRIORITY = [
  'jerusalem', 'middle-east', 'kyiv', 'washington',
  'taipei', 'tel-aviv', 'beirut-mtv', 'mecca', 'istanbul', 'medina', 'st-petersburg', 'tokyo', 'los-angeles', 'sydney', 'iss-earth',
] as const satisfies readonly WebcamSlotId[];

/**
 * Live News, keyed by channel id (the channel's name and handle live in LiveNewsPanel.ts). The
 * broadcaster's own HLS stream comes first where one exists, then a verified live video, then the
 * channel's live embed where YouTube allows it. A channel with [] is hidden from Available channels.
 */
export const LIVE_NEWS_SOURCES = {
  bloomberg: [
    'https://www.bloomberg.com/media-manifest/streams/us.m3u8',
    'https://www.youtube.com/watch?v=QB5BNdBFujE',
    'https://www.youtube.com/channel/UCIALMKvObZNtJ6AmdCLP7Lg',
  ],
  sky: [
    'https://linear901-oo-hls0-prd-gtm.delivery.skycdp.com/17501/sde-fast-skynews/master.m3u8',
    'https://www.youtube.com/watch?v=xDWQ3LkccY8',
  ],
  // Euronews' own YouTube live comes first. The HLS entry is a third-party test endpoint whose
  // playlist reads live but played no frames in Chrome (2026-09-14); it is kept deliberately as the
  // second option.
  euronews: [
    'https://www.youtube.com/watch?v=pykpO5kQJ98',
    'https://dash4.antik.sk/live/test_euronews/playlist.m3u8',
  ],
  dw: [
    'https://dwamdstream103.akamaized.net/hls/live/2015526/dwstream103/master.m3u8',
    'https://www.youtube.com/watch?v=LuKwFajn37U',
    'https://www.youtube.com/channel/UCknLrEdhRCp1aegoMqRaCZg',
  ],
  cnn: ['https://www.youtube.com/watch?v=GotlA1KKWoo'],
  france24: [
    'https://amg00106-france24-france24-samsunguk-qvpp8.amagi.tv/playlist/amg00106-france24-france24-samsunguk/playlist.m3u8',
    'https://www.youtube.com/watch?v=HvZt-nh9sGg',
  ],
  alarabiya: [
    'https://live.alarabiya.net/alarabiapublish/alarabiya.smil/playlist.m3u8',
    'https://www.youtube.com/watch?v=n7eQejkXbnM',
  ],
  aljazeera: [
    'https://live-hls-apps-aje-fa.getaj.net/AJE/index.m3u8',
    'https://www.youtube.com/watch?v=gCNeDWCI0vo',
    'https://www.youtube.com/channel/UCNye-wNBqNL5ZzHSJj3l8Bg',
  ],
  yahoo: ['https://www.youtube.com/watch?v=KQp-e_XQnDE'],
  nasa: ['https://www.youtube.com/watch?v=fO9e9jnhYK8'],
  'fox-news': ['https://247preview.foxnews.com/hls/live/2020027/fncv3preview/primary.m3u8'],
  'livenow-fox': ['https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg00488-foxdigital-livenowbyfox-lgus/playlist.m3u8'],
  // The first HLS comes from newsmaxtv.com's player and may be the Newsmax2 feed; the YouTube video is
  // Newsmax2 on @NewsmaxTV (2026-09-24, #8545).
  newsmax: [
    'https://n1ctsota.akamaized.net/hls/live/2113880/Live_1/index.m3u8',
    'https://nmxlive.akamaized.net/hls/live/529965/Live_1/index.m3u8',
    'https://www.youtube.com/watch?v=RNNFrG4KbH0',
  ],
  // abc-news, nbc-news, ctv-news and reuters-tv: their HLS hosts no longer resolve (2026-09-14).
  // ABC News Live and NBC News NOW play through their channel embeds (2026-09-24, #8545).
  'abc-news': ['https://www.youtube.com/channel/UCBi2mrWuNuyYy4gbM6fU18Q'],
  'cbs-news': ['https://cbsn-us.cbsnstream.cbsnews.com/out/v1/55a8648e8f134e82a470f83d562deeca/master.m3u8'],
  'nbc-news': ['https://www.youtube.com/channel/UCeY0bbntWzzVIaj2z3QigXg'],
  // cbcnewshd-f.akamaihd.net returned HTTP 404 (2026-09-14). CBC restarts its stream under new ids, so only
  // the channel is listed: the audit resolves its live video, since the channel embed fails with player error 150.
  'cbc-news': ['https://www.youtube.com/channel/UCuFFtHWoLl5fauMMD5Ww2jA'],
  // CTV News streams only in authenticated Canadian apps (2026-09-23, #8545).
  'ctv-news': [],
  // No 24/7 live Reuters publishes itself; the old wurl FAST hosts no longer resolve (2026-09-23, #8545).
  'reuters-tv': [],
  // UK-only: 403 outside the UK.
  'bbc-news': ['https://vs-hls-push-uk.live.fastly.md.bbci.co.uk/x=4/i=urn:bbc:pips:service:bbc_news_channel_hd/iptv_hd_abr_v1.m3u8'],
  'gb-news': ['https://live-gbnews.simplestreamcdn.com/live5/gbnews/bitrate1.isml/manifest.m3u8'],
  // Its HLS host no longer resolves (2026-09-14), and The Guardian has no 24/7 live channel
  // (2026-09-23, #8545).
  'the-guardian': [],
  // The same English stream as france24, for people who add it by this name.
  'france24-en': ['https://www.youtube.com/watch?v=HvZt-nh9sGg'],
  rtve: ['https://rtvelivestream.rtve.es/rtvesec/24h/24h_main_dvr.m3u8'],
  phoenix: ['https://zdf-hls-19.akamaized.net/hls/live/2016502/de/veryhigh/master.m3u8'],
  rtp3: ['https://streaming-live.rtp.pt/livetvhlsDVR/rtpnHDdvr.smil/playlist.m3u8?DVR='],
  'trt-haber': [
    'https://tv-trthaber.medya.trt.com.tr/master.m3u8',
    'https://www.youtube.com/channel/UCBgTP2LOFVPmq15W-RH-WXA',
  ],
  'ntv-turkey': ['https://www.youtube.com/watch?v=pqq5c6k70kk'],
  // The official HLS is referer- or token-gated (403). CNN TÜRK restarts and retitles its "CANLI HABER" live,
  // so only the channel is listed (its embed fails with player error 150; the audit resolves the live video).
  'cnn-turk': ['https://www.youtube.com/channel/UCV6zcRug6Hqp1UX_FdyUeBg'],
  // Only scheduled shows, no 24/7 live (2026-09-23, #8545).
  'tv-rain': [],
  rt: ['https://rt-glb.rttv.com/dvr/rtnews/playlist.m3u8'],
  'tvp-info': ['https://www.youtube.com/watch?v=3jKb-uThfrg'],
  'telewizja-republika': ['https://www.youtube.com/watch?v=dzntyCTgJMQ'],
  // CNN Brasil runs each show as its own dated live video, so only the channel is listed; its embed fails with
  // player error 150, and the audit resolves the running show (2026-09-24, #8545).
  'cnn-brasil': ['https://www.youtube.com/channel/UCvdwhh_fDyWccR42-rReZLw'],
  // The channel's running live (eTz4XgOQaAE) is a street camera on Avenida Paulista, not the news channel;
  // its news shows are scheduled dated videos (2026-09-24, #8545).
  'jovem-pan': [],
  // The ottera.tv entry returned HTTP 400 (2026-09-23, #8545).
  'record-news': ['https://www.youtube.com/channel/UCuiLR4p6wQ3xLEm15pEn1Xw'],
  // No reachable live found (2026-09-23, #8545).
  'band-jornalismo': [],
  'tn-argentina': ['https://www.youtube.com/watch?v=cb12KmMMDJA'],
  c5n: ['https://www.youtube.com/channel/UCFgk2Q2mVO1BklRQhSv6p0w'],
  // The channel embed fails with player error 150, so this is the running live video; its id changes when
  // Milenio restarts the stream. The channel is not listed: its featured live was "Más Milenio", not this
  // news stream (2026-09-24, #8545).
  milenio: ['https://www.youtube.com/watch?v=oPy8a-TCjzA'],
  // noticias-caracol and t13 restart their streams under new ids, so only the channel is listed; their embeds
  // fail with player error 150, and the audit resolves the live video (2026-09-24, #8545).
  'noticias-caracol': ['https://www.youtube.com/channel/UC2Xq2PK-got3Rtz9ZJ32hLQ'],
  ntn24: ['https://www.youtube.com/channel/UCEJs1fTF3KszRJGxJY14VrA'],
  t13: ['https://www.youtube.com/channel/UCsRnhjcUCR78Q3Ud6OXCTNg'],
  'dw-espanol': ['https://dwamdstream104.akamaized.net/hls/live/2015530/dwstream104/stream04/streamPlaylist.m3u8'],
  'rt-espanol': ['https://rt-esp.rttv.com/dvr/rtesp/playlist.m3u8'],
  // news.cgtn.com no longer resolves (2026-09-23, #8545).
  'cgtn-espanol': ['https://www.youtube.com/channel/UCd94YCD7yp6d-YZSRYWyeFA'],
  // tbs-news, ann-news and ntv-news: each broadcaster's 24h live video. ANN's and NTV's channel embeds
  // resolve to other lives (a press-conference replay, an airport cam) (2026-09-24, #8545).
  'tbs-news': ['https://www.youtube.com/watch?v=Anr15FA9OCI'],
  'ann-news': ['https://www.youtube.com/watch?v=coYw-eVU0Ks'],
  'ntv-news': ['https://www.youtube.com/watch?v=t9kwjZBLI-A'],
  // Fragile: the channel embed fails with player error 150, and CTi runs each news block as its own dated
  // live video, so this one ends within hours (2026-09-24, #8545). The channel is not listed: its /live page
  // featured the next scheduled block (upcoming) while this one played.
  'cti-news': ['https://www.youtube.com/watch?v=-YExqG4Llcw'],
  // The channel embed fails with player error 150; its id changes when WION restarts the stream. The channel
  // is not listed: its featured live was an event stream, not the 24/7 news (2026-09-24, #8545).
  wion: ['https://www.youtube.com/watch?v=X-7LAkvfA5s'],
  ndtv: ['https://ndtvindiaelemarchana.akamaized.net/hls/live/2003679/ndtvindia/master.m3u8'],
  // news.cgtn.com no longer resolves; the HLS is now on english-livebkali.cgtn.com. The channel embed fails
  // with player error 150, so the second entry is CGTN's 24/7 video (2026-09-24, #8545).
  cgtn: [
    'https://english-livebkali.cgtn.com/live/encgtn.m3u8',
    'https://www.youtube.com/watch?v=0i7n3r01L2U',
  ],
  'cna-asia': ['https://www.youtube.com/watch?v=XWq5kBlakcQ'],
  // nhk-world and abp-news: their HLS hosts no longer resolve (2026-09-14). NHK's HLS is now on
  // nhkworld.jp (2026-09-24, #8545).
  'nhk-world': [
    'https://masterpl.hls.nhkworld.jp/hls/w/live/master.m3u8',
    'https://www.youtube.com/channel/UCSPEjw8F2nQDtmUKPFNF7_A',
  ],
  'arirang-news': ['https://amdlive-ch01-ctnd-com.akamaized.net/arirang_1ch/smil:arirang_1ch.smil/playlist.m3u8'],
  'india-today': [
    'https://indiatodaylive.akamaized.net/hls/live/2014320/indiatoday/indiatodaylive/playlist.m3u8',
    'https://www.youtube.com/watch?v=sYZtOFzM78M',
  ],
  // ABP retitles and restarts its running live, so only the channel is listed; its embed fails with player
  // error 150, and the audit resolves the live video (2026-09-24, #8545).
  'abp-news': ['https://www.youtube.com/channel/UCRWFSbif-RFENbBrSiez1DA'],
  'al-hadath': ['https://av.alarabiya.net/alarabiapublish/alhadath.smil/playlist.m3u8'],
  'sky-news-arabia': ['https://live-stream.skynewsarabia.com/c-horizontal-channel/horizontal-stream/index.m3u8'],
  'trt-world': ['https://tv-trtworld.medya.trt.com.tr/master.m3u8'],
  // The HLS comes from iranintl.com's player (2026-09-24, #8545).
  'iran-intl': [
    'https://live.livetvstream.co.uk/LS-63503-4/index.m3u8',
    'https://www.youtube.com/watch?v=5JDxjsAVaGk',
  ],
  // news.cgtn.com no longer resolves (2026-09-23, #8545).
  'cgtn-arabic': ['https://www.youtube.com/channel/UCQmJk0ErE_FiorcLBsDKORA'],
  // Kan's own kancdn space on MedOne, an Israeli CDN; kan11.media.kan.org.il refused connections
  // (2026-09-23, #8545).
  'kan-11': ['https://kancdn.medonecdn.net/livehls/oil/kancdn-live/live/kan11/live.livx/playlist.m3u8'],
  // The Brightcove entry returned 503; i24news.tv's own player uses this immergo host (2026-09-24, #8545).
  'i24-news': ['https://i24newshebrew-cdn.encoders.immergo.tv/master.m3u8'],
  'asharq-news': ['https://www.youtube.com/watch?v=f6VpkfV7m4Y'],
  'aljazeera-arabic': [
    'https://live-hls-web-aja.getaj.net/AJA/index.m3u8',
    'https://www.youtube.com/watch?v=bNyUyrR0PHo',
  ],
  'aljazeera-mubasher': ['https://live-hls-web-ajm.getaj.net/AJM/index.m3u8'],
  'alarabiya-business': ['https://live.alarabiya.net/alarabiapublish/aswaaq.smil/playlist.m3u8'],
  // The Brightcove entry returned 503; alqaheranews.net links to and embeds this channel (2026-09-24, #8545).
  'al-qahera-news': ['https://www.youtube.com/channel/UCktyejXTxWaKfrgp1Oq7CMQ'],
  // cdnlive.presstv.ir served 502 behind a broken certificate chain; presstv.ir's own player loads this
  // manifest (2026-09-24, #8545).
  'press-tv': ['https://live.presstv.co.uk/hls/presstv.m3u8'],
  'dw-arabic': ['https://dwamdstream103.akamaized.net/hls/live/2015526/dwstream103/index.m3u8'],
  'rt-arabic': ['https://rt-arb.rttv.com/dvr/rtarab/playlist.m3u8'],
  // The itworkscdn entry stopped serving an HLS playlist; the HLS is now on rudaw.net (2026-09-24, #8545).
  rudaw: [
    'https://live.rudaw.net/hls/rudaw-tv/master.m3u8',
    'https://www.youtube.com/channel/UCAUHoE2Ykw0sguyi5AjhrjQ',
  ],
  africanews: ['https://www.youtube.com/channel/UC1_E8NeF5QHY2dtdLRBCCLA'],
  // Channels restarts its stream under new ids, so only the channel is listed; its embed fails with player
  // error 150, and the audit resolves the live video (2026-09-24, #8545).
  'channels-tv': ['https://www.youtube.com/channel/UCEXGDNclvmg6RW0vipJYsTQ'],
  'ktn-news': ['https://www.youtube.com/channel/UCKVsdeoHExltrWMuK0hOWmg'],
  // No reachable live found (2026-09-23, #8545).
  enca: [],
  'sabc-news': [
    'https://sabconetanw.cdn.mangomolo.com/news/smil:news.stream.smil/chunklist_b250000_t64MjQwcA==.m3u8',
    'https://sabconetanw.cdn.mangomolo.com/news/smil:news.stream.smil/playlist.m3u8',
  ],
  // The visioncdn HLS host no longer resolves (2026-09-23, #8545).
  'arise-news': ['https://www.youtube.com/channel/UCyEJX-kSj0kOOCS7Qlq2G7g'],
  // The official HLS returns 401; the channel embed plays outside DE/AT/CH (2026-09-24, #8545).
  welt: ['https://www.youtube.com/channel/UCZMsvbAhhRblVGXmEXW8TSA'],
  tagesschau24: ['https://tagesschau.akamaized.net/hls/live/2020115/tagesschau/tagesschau_1/master.m3u8'],
  'euronews-fr': ['https://www.youtube.com/watch?v=NiRIbKwAejk'],
  'euronews-gr': ['https://www.youtube.com/channel/UC8HJZNfDPoySgW9DN3YGNaA'],
  // Embedded on skai.gr/tv/live (2026-09-24, #8545).
  'skai-tv': ['https://skai-live.siliconweb.com/media/cambria4/index.m3u8'],
  // ERT's own space on Broadpeak, the old entry's vendor; the ertflix entry returned HTTP 404 (#8545).
  'ert-news': ['https://ert-ucdn.broadpeak-aas.com/bpk-tv/ERTNews/default/index.m3u8'],
  'france24-fr': ['https://www.youtube.com/watch?v=a47ckXKZjxI'],
  // franceinfo restarts its stream under new ids, so only the channel is listed; its embed fails with player
  // error 150, and the audit resolves the live video (2026-09-24, #8545).
  'france-info': ['https://www.youtube.com/channel/UCO6K_kkdP-lnSCiO3tPx7WA'],
  // The HLS is embedded on bfmtv.com. The channel embed currently plays BFM2, not the main feed
  // (2026-09-24, #8545).
  bfmtv: [
    'https://live-cdn-stream-euw1.bfmtv.bct.nextradiotv.com/master.m3u8',
    'https://www.youtube.com/channel/UCXwDLMDV86ldKoFVc_g8P0g',
  ],
  'tv5monde-info': ['https://ott.tv5monde.com/Content/HLS/Live/channel(info)/index.m3u8'],
  nrk1: ['https://nrk-nrk1.akamaized.net/21/0/hls/nrk_1/playlist.m3u8'],
  'abc-news-au': [
    'https://abc-iview-mediapackagestreams-2.akamaized.net/out/v1/6e1cc6d25ec0480ea099a5399d73bc4b/index.m3u8',
    'https://www.youtube.com/watch?v=vOTiJkg1voo',
  ],
} as const satisfies Record<string, readonly string[]>;

export type LiveNewsSlotId = keyof typeof LIVE_NEWS_SOURCES;

/** Two channel embeds that are reliably live. If both fail, the audit reports broken probing, not rot. */
export const AUDIT_CANARIES = [
  'https://www.youtube.com/channel/UCNye-wNBqNL5ZzHSJj3l8Bg',
  'https://www.youtube.com/channel/UCknLrEdhRCp1aegoMqRaCZg',
] as const;
