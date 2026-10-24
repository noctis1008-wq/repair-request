# ポケモン セーブデータ修復の受付

> **開発する人へ**: このプロジェクトは複数の開発者が作業しています。作業の前に必ず [`HANDOFF.md`](HANDOFF.md)(引き継ぎメモ)を読み、作業のあとに記録を足してください。

X・Y / オメガルビー・アルファサファイアの壊れたセーブデータの修復依頼を受け付けるページ(GitHub Pages)。

- `index.html` … 依頼する / 結果を確認する。送り先はページ内の `REPAIR_URL`(Google Apps Script のウェブアプリの URL)。
- `repair_receiver.gs` … 受け取り側の Google Apps Script(ドライブ「NER 修復依頼」に依頼ごとのフォルダを作る)。
- 管理者は依頼のフォルダに修復後のセーブを「main」という名前で置くと「修復完了」になる。「修復不可.txt」「メモ.txt」も使える。
- NER Pokémon Recovery の「修復をリクエストする」から `?from=recovery` で開かれると、同じサイトの IndexedDB `nerRepairHandoff` から
  壊れたセーブと救出したデータの 2 つを読み込んで添付する。救出したデータはドライブに `recovery_…` として保存される(`main` にすると修復完了扱いになるため)。
  この受け取りには `repair_receiver.gs` の新しい版のデプロイが必要。

- 画面(v3): 上部バー・手順(取り出す → 依頼する → 受け取る)・カードは NER Pokémon Recovery / NER Converter と同じデザイン。
  スマホは「修復を依頼する / 結果を確認する」の切り替え、パソコン(960px 以上)は左に依頼フォーム・右に結果の確認を並べる。
  CSS を変えたら `index.html` と `privacy.html` の `style.css?v=` を同じ数字に上げる。
