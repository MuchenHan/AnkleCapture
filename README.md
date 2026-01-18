# AnkleCapture

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

足関節角度測定システム - 臨床・研究用 Web アプリケーション

## 概要

**AnkleCapture** は、標準化された条件で足関節角度（足関節背屈角度）を測定するための Web アプリケーションです。スマートフォンやPC のブラウザで動作し、カメラを用いたリアルタイム撮影モードと、既存写真をインポートして測定するモードの両方をサポートしています。

**Live Demo**: [https://webapp-rouge-six.vercel.app](https://webapp-rouge-six.vercel.app) *(要HTTPS)*

---

# ユーザーガイド (User Guide)

臨床・研究での利用者向けのマニュアルです。

## 主な機能

| 機能 | 説明 |
|------|------|
| **クロスデバイス対応** | iPhone Safari、Android Chrome、デスクトップブラウザで動作 |
| **リアルタイム撮影** | WebRTC getUserMedia API による後方カメラ撮影 |
| **写真インポート** | 既存写真の読み込み（JPEG, PNG, HEIC対応）、自動EXIF回転補正 |
| **足部輪郭ガイド** | 左右脚対応の SVG ガイドオーバーレイ |
| **9グリッド表示** | 標準化された撮影条件のためのグリッド |
| **水平仪（レベルインジケーター）** | DeviceOrientation API によるリアルタイム傾き検出 |
| **4ステップガイダンス** | 撮影条件の確認項目チェックリスト |
| **3点測角** | タッチ/クリック操作による角度測定（腓骨頭・外果・第5中足骨頭） |
| **オフライン対応** | IndexedDB によるローカルストレージ |
| **データ出力** | CSV、JSON、画像形式での出力 |

## 使用方法

### Step 1: 情報入力
- 被験者ID（必須）
- 測定者ID（任意）
- 測定側（左足/右足）
- 測定モード（リアルタイム撮影 / 写真インポート）

### Step 2: 画像取得

**リアルタイム撮影モード:**
1. 水平仪を有効化
2. 4ステップ確認（足の配置、踵接地、足が平ら、距離3m）
3. 撮影ボタンをタップ

**写真インポートモード:**
1. 写真を選択
2. 品質チェックリストを確認
3. 測定へ進む

### Step 3: 3点測角
- 画像上で3点をタップ/クリック
  1. 腓骨頭（Fibular Head）
  2. 外果（Lateral Malleolus）
  3. 第5中足骨頭（5th Metatarsal Head）
- 角度が自動計算されます
- ポイントをドラッグして微調整可能

### Step 4: データ出力
- CSV形式（統計解析用）
- JSON形式（詳細データ）
- 画像（原画像 + 測定オーバーレイ画像）

## ブラウザ互換性

| ブラウザ | 対応状況 |
|---------|---------|
| iPhone Safari 13+ | 完全対応 |
| Android Chrome 80+ | 完全対応 |
| Desktop Safari | 完全対応 |
| Desktop Chrome | 完全対応 |

## トラブルシューティング

| 問題 | 解決方法 |
|------|---------|
| カメラが起動しない | HTTPS接続を確認 / ブラウザのカメラ権限を確認 |
| 水平仪が動作しない | モーションセンサーへのアクセス許可を確認 |
| データが保存されない | プライベートブラウズモードを無効化 |

---

# 開発者ガイド (Developer Guide)

今後の機能追加やメンテナンスを行う開発者向けのドキュメントです。

## 技術スタック

- **フロントエンド**: Vanilla JavaScript + HTML5 + CSS3
- **カメラ API**: WebRTC getUserMedia
- **センサー**: DeviceOrientation API
- **ストレージ**: IndexedDB
- **描画**: Canvas 2D + SVG
- **デプロイ**: Vercel

## プロジェクト構成

```
AnkleCapture/
├── webapp/                 # Webアプリケーション本体
│   ├── index.html          # メインHTML
│   ├── css/                # スタイルシート
│   ├── js/                 # JavaScriptモジュール
│   ├── assets/             # 静的アセット（SVGガイドなど）
│   └── README.md           # WebApp詳細ドキュメント
```

## ローカル開発環境のセットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/MuchenHan/AnkleCapture.git
cd AnkleCapture/webapp
```

### 2. ローカルサーバーの起動

```bash
python3 -m http.server 8000
```
ブラウザで `http://localhost:8000` にアクセスします。

**注意**: 
カメラ機能（getUserMedia）には **HTTPS** が必須です。完全なテストを行うには、ngrok 等を使用してください。

```bash
# ngrok で HTTPS トンネルを作成
ngrok http 8000
```

## データ構造 (出力JSON)

アプリケーションが出力する測定データの構造です。

```javascript
{
  session_id: "session_1234567890_abc123",
  subject_id: "P001",
  operator_id: "OT_yamada",
  side: "L",
  measurement_type: "ankle_dorsiflexion",
  measurement_mode: "realtime", // or "import"
  checklist: {
    foot_in_frame: true,
    heel_on_ground: true,
    foot_flat: true,
    distance_confirmed: "appropriate"
  },
  device_orientation: {
    pitch_deg: 1.2,
    roll_deg: -0.8,
    is_level: true
  },
  points: [
    { label: "fibular_head", x: 234, y: 156 },
    { label: "lateral_malleolus", x: 245, y: 312 },
    { label: "5th_metatarsal", x: 312, y: 345 }
  ],
  angle_value: 18.5,
  timestamp: "2026-01-14T14:32:15+09:00"
}
```

## デプロイ

**Vercel** へのデプロイを推奨します。

1. Root Directory を `webapp` に設定
2. ビルドコマンドは不要（静的サイト）

---

## ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。

**ご自由にお使いください！**
研究、臨床、学習、個人開発など、用途を問わず自由にご利用いただけます。また、ニーズに合わせてコードを自由に改変・カスタマイズしていただいて構いません。
