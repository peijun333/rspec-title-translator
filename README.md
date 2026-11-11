# RSpec Title Translator

GitHub の diff 上で、RSpec の `describe` / `context` / `it` などのタイトルだけを日本語に訳して表示する Chrome 拡張です。

表示イメージ（実際の訳文は翻訳モデルによって変わります）：

```ruby
describe 'User' do
  # ユーザー
  context 'when the user is admin' do
    # ユーザーが管理者の場合
    it 'returns all records' do
      # すべてのレコードを返します
```

- 訳文は CSS の疑似要素で表示するので、コードをコピーしても訳文は混ざりません
- 翻訳には Chrome 組み込みの [Translator API](https://developer.chrome.com/docs/ai/translator-api) を使います。翻訳はブラウザ内で行われ、コードが外部サーバーに送られることはありません
- 次のタイトルは訳しません
  - 日本語を含むもの
  - `#call` や `.perform` のような、メソッド名だけのもの
  - `GET /api/users` のような、HTTP エンドポイントのもの

## 動作環境

- Chrome 138 以降（Translator API に対応したデスクトップ版）

## インストール方法

Chrome ウェブストアには公開していないので、「パッケージ化されていない拡張機能」として読み込みます。

1. このリポジトリを clone します（または GitHub の **Code → Download ZIP** でダウンロードして展開します）

   ```sh
   git clone https://github.com/peijun333/rspec-title-translator.git
   ```

2. Chrome のアドレスバーに `chrome://extensions` と入力して開きます
3. 右上の **デベロッパー モード** をオンにします
4. **パッケージ化されていない拡張機能を読み込む** をクリックします
5. clone したフォルダ（`manifest.json` があるフォルダ）を選びます
6. 一覧に「RSpec Title Translator」が表示されれば完了です

### 初回のみ：翻訳モデルのダウンロード

インストール後に初めて GitHub の PR の diff を開くと、画面右下に **「RSpec タイトル翻訳: 翻訳モデルをダウンロード」** ボタンが表示されます。クリックすると英語→日本語の翻訳モデルがダウンロードされ、完了すると訳文が表示されるようになります。2 回目以降はボタンは出ません。

## 使い方

GitHub で PR の **Files changed** やファイル表示を開くと、spec ファイル中のタイトルの下に訳文が表示されます。

## 更新方法

```sh
git pull
```

pull したあと、`chrome://extensions` で本拡張の再読み込みボタン（↻）を押してください。

## アンインストール

`chrome://extensions` で本拡張の **削除** をクリックします。
