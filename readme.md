# RGB565 変換ツール

🎨 画像を16ビットカラーフォーマット（RGB565）に変換するオンラインツール

## 🚀 ライブデモ

**[https://mina-root.github.io/RGB565Converter/](https://mina-root.github.io/RGB565Converter/)** でツールを使用できます

## 📝 機能

- **画像アップロード**: PNG、JPEG、BMP、GIF、WebPに対応
- **リアルタイムプレビュー**: 変換前後の画像を比較表示
- **フィルター**: グレースケール、セピア、反転、明るさ、コントラスト調整
- **ディザリング**: Floyd-Steinberg、Ordered (Bayer)、Atkinson ディザリングに対応
- **複数の出力形式**:
  - PNG画像として保存
  - C言語配列形式（.h ファイル）としてエクスポート
- **拡大/縮小表示**: ズーム機能で詳細確認
- **ドラッグ&ドロップ対応**: ファイルを直接ドラッグ
- **クリップボード貼り付け**: Ctrl+Vで画像を貼り付け

## ⚙️ RGB565について

RGB565は16ビットカラーフォーマットで、以下のビット配列で色を表現します：
- **赤（R）**: 5ビット（0-31の値）
- **緑（G）**: 6ビット（0-63の値）
- **青（B）**: 5ビット（0-31の値）

メモリ使用量を削減しつつ良好な色再現性を提供するため、組み込みシステムやマイコンのディスプレイで広く使用されています。

## 🎯 用途

- 組み込み機器向けの画像データ変換
- マイコンボード（Arduino、ESP32など）の画像表示用データ作成
- TFTディスプレイなどの低色数環境向け画像最適化
- RGB565フォーマットの確認・検証

## 📁 ファイル構成

```
RGB565Converter/
├── index.html      # HTMLマークアップ
├── styles.css      # スタイルシート
├── script.js       # JavaScriptロジック
└── readme.md       # このファイル
```

## 🛠️ 技術スタック

- **フロントエンド**: HTML5, CSS3, Vanilla JavaScript
- **ホスティング**: GitHub Pages

## 📋 注意事項

- このツールはブラウザ上で完全に動作し、サーバーに画像がアップロードされることはありません
- 処理はすべてローカルで実行されるため、大きな画像ファイルでも安心です
- ファイル名を指定してダウンロードすることで、元の画像名を保持できます

### PNG出力について
- **PNG画像**: PNGフォーマットはRGB565をネイティブサポートしていないため、RGB565で計算された色をRGB24(32ビット)で保存します
- **色数**: RGB565の限定的な色パレット（最大65,536色）が反映されていますが、ファイルサイズは24ビットです

### C配列出力について
- **C配列形式**: 実際のRGB565 16ビット値（`uint16_t`）で出力されます
- **用途**: マイコンやマイクロコントローラーで直接使用できる形式です
- **推奨**: 組み込み機器向けに使用する場合はC配列形式での出力を推奨します

## 📄 ライセンス

```

MIT License

Copyright (c) 2026 Minamoto

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

```

---

**作成者**: Minamoto
