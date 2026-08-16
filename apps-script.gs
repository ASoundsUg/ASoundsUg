// ASounds standalone content backend
// Google Sheets + Apps Script. The public ASounds site reads song records from this endpoint.
//
// SHEET COLUMNS:
// title | artist | genre | description | sourceUrl | youtubeUrl | coverUrl | slug | createdAt
//
// SETUP:
// 1. Create a Google Sheet named ASounds.
// 2. Extensions > Apps Script.
// 3. Paste this file.
// 4. Change ADMIN_KEY.
// 5. Run setup() once.
// 6. Deploy > New deployment > Web app.
//    Execute as: Me
//    Who has access: Anyone
// 7. Put the /exec URL into index.html, song.html and admin.html.

const SHEET_NAME = 'Songs';
const ADMIN_KEY = 'CHANGE_THIS_TO_A_LONG_RANDOM_SECRET';

function setup() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  const headers = ['title','artist','genre','description','sourceUrl','youtubeUrl','coverUrl','slug','createdAt'];
  if (sh.getLastRow() === 0) sh.appendRow(headers);
  return sh;
}

function doGet(e) {
  try {
    setup();
    const p = (e && e.parameter) || {};
    if (p.action === 'preview' && p.url) {
      return json(fetchMetadata(p.url));
    }
    const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
    const values = sh.getDataRange().getValues();
    const rows = values.slice(1).filter(r => r[0]);
    let songs = rows.map(rowToSong);
    if (p.slug) songs = songs.filter(s => s.slug === p.slug);
    return json({ok:true,songs:songs});
  } catch (err) {
    return json({ok:false,message:err.message});
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action !== 'addSong') return json({ok:false,message:'Invalid action.'});
    if (body.key !== ADMIN_KEY) return json({ok:false,message:'Invalid admin key.'});
    if (!body.title || !body.artist || !body.description || !body.sourceUrl) {
      return json({ok:false,message:'Title, artist, description and song URL are required.'});
    }

    const meta = fetchMetadata(body.sourceUrl);
    const cover = body.coverUrl || meta.coverUrl || '';
    const yt = body.youtubeUrl || meta.youtubeUrl || '';
    const genre = body.genre || meta.genre || 'Music';
    const slug = uniqueSlug(slugify(body.title + '-' + body.artist));

    const sh = setup();
    sh.appendRow([
      clean(body.title),
      clean(body.artist),
      clean(genre),
      clean(body.description),
      clean(body.sourceUrl),
      clean(yt),
      clean(cover),
      slug,
      new Date()
    ]);

    return json({ok:true,message:'Song added successfully.',song:{
      title:body.title,artist:body.artist,genre:genre,description:body.description,
      sourceUrl:body.sourceUrl,youtubeUrl:yt,coverUrl:cover,slug:slug
    }});
  } catch(err) {
    return json({ok:false,message:'Server error: ' + err.message});
  }
}

function rowToSong(r) {
  return {
    title:r[0] || '',
    artist:r[1] || '',
    genre:r[2] || '',
    description:r[3] || '',
    sourceUrl:r[4] || '',
    youtubeUrl:r[5] || '',
    coverUrl:r[6] || '',
    slug:r[7] || '',
    createdAt:r[8] ? new Date(r[8]).toISOString() : ''
  };
}

function fetchMetadata(url) {
  if (!/^https:\/\/(www\.)?gandiwave\.com\/song\//i.test(url)) {
    return {ok:false,message:'Please use a GandiWave song URL.'};
  }
  const response = UrlFetchApp.fetch(url, {muteHttpExceptions:true,followRedirects:true});
  const code = response.getResponseCode();
  if (code < 200 || code >= 400) return {ok:false,message:'Could not read the song page (HTTP '+code+').'};
  const html = response.getContentText();

  const title = firstMeta(html, ['og:title','twitter:title']) || firstTag(html,'title');
  const description = firstMeta(html, ['og:description','twitter:description','description']);
  const coverUrl = absoluteUrl(url, firstMeta(html, ['og:image','twitter:image']));
  const genre = firstMeta(html, ['article:section']) || '';
  const youtubeUrl = findYoutube(html);

  // GandiWave song pages expose the artist in a "by Artist" heading.
  let artist = '';
  const byMatch = html.match(/(?:>|\s)by\s*<[^>]+>\s*([^<]{2,100})\s*<\//i);
  if (byMatch) artist = strip(byMatch[1]);
  if (!artist) {
    const m2 = html.match(/"artist"\s*:\s*"([^"]+)"/i);
    if (m2) artist = strip(m2[1]);
  }

  return {ok:true,title:strip(title),artist:artist,genre:strip(genre),description:strip(description),coverUrl:coverUrl,youtubeUrl:youtubeUrl};
}

function firstMeta(html, names) {
  for (let i=0;i<names.length;i++) {
    const n = names[i].replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    let m = html.match(new RegExp('<meta[^>]+(?:property|name)=[\"\\']'+n+'[\"\\'][^>]+content=[\"\\']([^\"\\']*)[\"\\']','i'));
    if (!m) m = html.match(new RegExp('<meta[^>]+content=[\"\\']([^\"\\']*)[\"\\'][^>]+(?:property|name)=[\"\\']'+n+'[\"\\']','i'));
    if (m && m[1]) return decode(m[1]);
  }
  return '';
}

function firstTag(html, tag) {
  const m = html.match(new RegExp('<'+tag+'[^>]*>([\\s\\S]*?)</'+tag+'>','i'));
  return m ? strip(m[1]) : '';
}

function findYoutube(html) {
  const m = html.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)[A-Za-z0-9_-]{6,}/i);
  return m ? m[0] : '';
}

function absoluteUrl(base, value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.indexOf('//') === 0) return 'https:' + value;
  if (value.charAt(0) === '/') return 'https://www.gandiwave.com' + value;
  return '';
}

function decode(s) {
  return s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}
function strip(s) { return decode(String(s||'').replace(/<[^>]+>/g,' ')).replace(/\\s+/g,' ').trim(); }
function clean(s) { return String(s||'').trim(); }
function slugify(s) { return s.toString().toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
function uniqueSlug(slug) {
  const sh = setup(), values = sh.getRange(2,8,Math.max(sh.getLastRow()-1,0),1).getValues().flat();
  if (values.indexOf(slug) === -1) return slug;
  let i=2; while(values.indexOf(slug+'-'+i) !== -1) i++;
  return slug+'-'+i;
}
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
