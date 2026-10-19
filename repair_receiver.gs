/**
 * NER Pokémon Recovery — セーブデータの修復依頼(Google Apps Script)
 *
 * 依頼ページ(request.html)から送られた破損セーブを、あなたの Google ドライブの
 * 「NER 修復依頼」フォルダに、依頼ごとのフォルダを作って保存します。
 *
 * 管理者(あなた)の作業:
 *   1. ドライブの「NER 修復依頼」に依頼ごとのフォルダができます(名前: 受付日時_ユーザー名)。
 *      中に 破損セーブ(broken_…)と依頼内容(request.json。パスワードはハッシュ化済み)があります。
 *   2. 修復できたら、そのフォルダに修復後のセーブを「main」という名前でアップロードします。
 *      → 依頼者が結果を確認すると「修復完了」と表示され、パスワードを入れるとダウンロードできます。
 *   3. 修復できなかったときは、そのフォルダに「修復不可.txt」を作り、依頼者へのひとことを書きます。
 *   4. 依頼者へのお知らせを出したいときは「メモ.txt」を作ると、結果確認の画面に表示されます。
 *
 * 新しい依頼が届くと、このスクリプトの持ち主(あなた)の Gmail にお知らせが届きます(NOTIFY_EMAIL)。
 */

const ROOT_NAME = 'NER 修復依頼';
const ALLOWED_SIZES = { 0x65600: 'XY', 0x76000: 'ORAS' };   // X・Y と ORAS の main
const MAX_PER_HOUR = 20;          // 1 時間に受け付ける依頼の数(いたずら対策)
const MAX_TRIES_PER_HOUR = 10;    // 1 人あたり 1 時間にパスワードを間違えられる回数
const NOTIFY_EMAIL = true;        // 新しい依頼をメールで知らせる

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    if (req.action === 'submit') return json(submit(req));
    if (req.action === 'status') return json(status(req, false));
    if (req.action === 'download') return json(status(req, true));
    if (req.action === 'list') return json(list());
    return json({ ok: false, error: '不明な操作です。' });
  } catch (err) {
    return json({ ok: false, error: 'サーバーでエラーが起きました。時間をおいて、もう一度お試しください。' });
  }
}

// ブラウザでこのアドレスを開いたときの表示(動いているかの確認用)
function doGet() {
  return ContentService.createTextOutput('NER Recovery repair receiver is running.');
}

function submit(req) {
  const name = String(req.name || '').trim();
  const pass = String(req.password || '');
  const comment = String(req.comment || '').slice(0, 1000);
  if (name.length < 1 || name.length > 30) return { ok: false, error: 'ユーザー名は 1〜30 文字で入力してください。' };
  if (pass.length < 4 || pass.length > 64) return { ok: false, error: 'パスワードは 4〜64 文字で入力してください。' };
  const bytes = Utilities.base64Decode(req.data || '');
  const game = ALLOWED_SIZES[bytes.length];
  if (!game) return { ok: false, error: 'X・Y または オメガルビー・アルファサファイアの main(セーブデータ)を選んでください。' };

  const props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const hourKey = 'count_' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMddHH');
    const count = Number(props.getProperty(hourKey) || 0);
    if (count >= MAX_PER_HOUR) return { ok: false, error: 'ただいま依頼が混み合っています。時間をおいて、もう一度お試しください。' };
    const key = userKey(name);
    if (props.getProperty(key)) return { ok: false, error: 'このユーザー名はすでに使われています。別のユーザー名にしてください。' };

    const stamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd-HHmmss');
    const id = stamp.slice(2, 8) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    const folder = getRoot().createFolder(stamp + '_' + name.replace(/[\\/:*?"<>|]/g, '_'));
    folder.createFile(Utilities.newBlob(bytes, 'application/octet-stream', 'broken_' + game + '_' + String(req.fileName || 'main').replace(/[\\/:*?"<>|]/g, '_').slice(0, 60)));
    const salt = Utilities.getUuid();
    const info = { id, name, game, comment, created: stamp, salt, hash: hashPass(pass, salt), toolVersion: String(req.version || '') };
    folder.createFile('request.json', JSON.stringify(info, null, 2), 'application/json');
    props.setProperty(key, folder.getId());
    props.setProperty(hourKey, String(count + 1));
    CacheService.getScriptCache().remove('list');

    if (NOTIFY_EMAIL) {
      try {
        MailApp.sendEmail(Session.getEffectiveUser().getEmail(), '【NER】修復依頼が届きました: ' + name,
          'ユーザー名: ' + name + '\n受付番号: ' + id + '\nゲーム: ' + game + '\n備考:\n' + comment + '\n\nフォルダ: ' + folder.getUrl());
      } catch (e) { /* メールが送れなくても受付は続ける */ }
    }
    return { ok: true, id };
  } finally {
    lock.releaseLock();
  }
}

function status(req, withFile) {
  const name = String(req.name || '').trim();
  const pass = String(req.password || '');
  const props = PropertiesService.getScriptProperties();
  const folderId = props.getProperty(userKey(name));
  const fail = { ok: false, error: 'ユーザー名またはパスワードが違います。' };
  if (!folderId) return fail;

  // パスワードの総当たり対策
  const tryKey = 'try_' + userKey(name) + '_' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMddHH');
  const tries = Number(props.getProperty(tryKey) || 0);
  if (tries >= MAX_TRIES_PER_HOUR) return { ok: false, error: 'パスワードを何度も間違えたため、しばらく確認できません。1 時間ほどおいてお試しください。' };

  const folder = DriveApp.getFolderById(folderId);
  const info = JSON.parse(readText(folder, 'request.json') || '{}');
  if (!info.hash || hashPass(pass, info.salt) !== info.hash) {
    props.setProperty(tryKey, String(tries + 1));
    return fail;
  }

  const note = readText(folder, 'メモ.txt');
  const failed = readText(folder, '修復不可.txt');
  const repaired = findFile(folder, 'main');
  const res = { ok: true, id: info.id, created: info.created, note: note || '' };
  if (repaired) {
    res.status = 'done';
    if (withFile) {
      res.fileName = 'main';
      res.data = Utilities.base64Encode(repaired.getBlob().getBytes());
    }
  } else if (failed !== null) {
    res.status = 'failed';
    res.message = failed;
  } else {
    res.status = 'waiting';
  }
  return res;
}

// 結果確認画面に出す一覧(ユーザー名・受付日時・進捗だけ。パスワードやコメントは出さない)
function list() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('list');
  if (hit) return JSON.parse(hit);
  const items = [];
  const it = getRoot().getFolders();
  while (it.hasNext()) {
    const folder = it.next();
    const info = JSON.parse(readText(folder, 'request.json') || '{}');
    if (!info.name) continue;
    const st = findFile(folder, 'main') ? 'done' : (readText(folder, '修復不可.txt') !== null ? 'failed' : 'waiting');
    items.push({ id: info.id || '', created: info.created || '', status: st });   // 一覧には受付番号だけを出す(ユーザー名は出さない)
  }
  items.sort((a, b) => (a.created < b.created ? 1 : -1));
  const res = { ok: true, items };
  cache.put('list', JSON.stringify(res), 60);   // 1 分間は同じ結果を返す(ドライブを何度も読まないため)
  return res;
}

function userKey(name) {
  const h = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, name.trim().toLowerCase(), Utilities.Charset.UTF_8);
  return 'user_' + h.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('').slice(0, 24);
}
function hashPass(pass, salt) {
  const h = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + pass, Utilities.Charset.UTF_8);
  return h.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}
function findFile(folder, name) {
  const it = folder.getFilesByName(name);
  return it.hasNext() ? it.next() : null;
}
function readText(folder, name) {
  const f = findFile(folder, name);
  return f ? f.getBlob().getDataAsString('UTF-8') : null;
}
function getRoot() {
  const it = DriveApp.getFoldersByName(ROOT_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(ROOT_NAME);
}
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// 最初に 1 回だけ実行してください(フォルダを作り、ドライブとメールを使う許可を出すため)
function setup() {
  const folder = getRoot();
  Logger.log('フォルダ: ' + folder.getName() + ' (' + folder.getUrl() + ')');
  Logger.log('お知らせの送り先: ' + Session.getEffectiveUser().getEmail());
}
