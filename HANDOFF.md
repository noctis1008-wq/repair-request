# 引き継ぎメモ — 修復依頼ページ(repair-request)

## ⚠️ 必ず守ること(このプロジェクトは複数の開発者が同時に作業しています)

人間でも AI(Claude・Codex など)でも、このリポジトリで作業する人は全員、次の 3 つを守ってください。

1. **作業を始める前に**、`git pull`(または `git fetch`)で最新にしてから、この `HANDOFF.md` を読む。
   ほかの人が何をしたか・何をしている途中か・何を頼まれているかは、ここに書いてあります。
2. **作業が終わったら(コミット・PR の前に)**、下の「作業ログ」のいちばん上に記録を 1 つ足す。
   「現在の状態」「進行中・やり残し」も、変わったところを書き直す。
3. **記録のない変更はマージしない・公開しない。** 小さな修正でも 1 行は書く。
   GitHub の自動チェック(「引き継ぎメモの確認」)が、HANDOFF.md を変えずにファイルを変えたコミット・PR に ✗ を付けます。

### 記録の書き方(作業ログ)

```
### YYYY-MM-DD — だれが(名前、または「Claude(セッションのリンク)」など)
- やったこと: (版番号があれば書く。例: v81)
- 確かめたこと: (テスト・ブラウザでの確認など)
- 次の人へ: (途中の作業・気をつけること・頼まれていて未対応のこと。なければ「なし」)
```

- やさしい日本語で、あとから来た人が読んでわかるように書く。
- 公開されているリポジトリなので、他人のセーブデータの中身・個人を特定できる情報・パスワードは書かない。

---

## 現在の状態(2026-10-25 時点)

- 版: **v3**。https://noctis1008-wq.github.io/repair-request/
- 受付は Google Apps Script(`repair_receiver.gs`)。ページの `REPAIR_URL` がその送り先。**`repair_receiver.gs` を変えたら、運営者に Apps Script へ貼り直して「デプロイを管理 → 新バージョン」で更新してもらう必要がある**(リポジトリを変えただけでは反映されない)。今の GAS は、受付番号を返す版・救出データ(`data2`)を `recovery_…` として保存する版まで更新済み。
- 受付一覧にはユーザー名を出さず、受付番号だけを出す。
- `?from=recovery` で開くと、NER Pokémon Recovery が IndexedDB `nerRepairHandoff` に置いた 2 つのファイル(壊れたセーブ・救出したデータ)を添付した状態になる。Recovery 側と対になっているので、片方だけ変えないこと。
- NER Pokémon Recovery 本体へのリンクは置かない(Recovery がまだ非公開のため)。

## 進行中・やり残し

- なし

## ほかのリポジトリの引き継ぎメモ

3 つのサイトは同じドメイン(https://noctis1008-wq.github.io/)で、互いにリンク・データの受け渡しがあります。関係するときは、そちらの HANDOFF.md も読んでください。

- ポータル・NER Converter・Poke tools(Web 版): https://github.com/noctis1008-wq/noctis1008-wq.github.io/blob/main/HANDOFF.md
- NER Pokémon Recovery: https://github.com/noctis1008-wq/Pokemon-Save-Rescue/blob/main/HANDOFF.md
- 修復依頼ページ: https://github.com/noctis1008-wq/repair-request/blob/main/HANDOFF.md

---

## 作業ログ(新しいものが上)

### 2026-10-25 — Claude(https://claude.ai/code/session_01JUok9xt7wAbcW7ReTZmiLq)
- やったこと: 引き継ぎメモ(この HANDOFF.md)と、作業前に読む・作業後に書くルールを追加。`CLAUDE.md`・`AGENTS.md`、PR のチェック項目、自動チェックを追加。
- 確かめたこと: 自動チェックが動くこと。
- 次の人へ: これからは作業のたびに、このログに記録を足してください。

### 2026-10-20 〜 10-21 — (コミット履歴から要約。この HANDOFF.md ができる前の作業)
- 2026-10-21: 画面を NER ツール共通のデザインに(v3)。左上に NER PORTAL SITE へのリンク。
- 2026-10-20(Claude): Recovery から壊れたセーブと救出したデータを受け取る(GAS も対応)。受付一覧を受付番号の表示に。
