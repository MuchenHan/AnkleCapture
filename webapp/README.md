# AnkleCapture WebApp

足関節角度測定システム - 臨床・研究用 iPhone WebApp

## 概要

AnkleCaptureは、標準化された条件で足関節角度を測定するためのWebアプリケーションです。iPhone Safariで動作し、カメラガイド、デバイス傾き検出、3点測角機能を提供します。

### 主な機能

- 📱 **iPhone Safari対応** - 後方カメラを使用した撮影
- 📐 **9グリッド表示** - 標準化された撮影条件
- 🎯 **足部輪郭ガイド** - 左右脚対応のSVGガイド
- 📏 **水平仪（レベルインジケーター）** - DeviceMotion APIによるリアルタイム傾き検出
- ✅ **4ステップガイダンス** - 確認項目の記録
- 📍 **3点測角** - タッチ操作による角度測定
- 💾 **オフライン対応** - IndexedDBによるローカルストレージ
- 📊 **データエクスポート** - CSV、JSON、画像形式

## 技術スタック

- **フロントエンド**: Vanilla JavaScript + HTML5 + CSS3
- **カメラAPI**: WebRTC getUserMedia
- **センサー**: DeviceOrientation API
- **ストレージ**: IndexedDB
- **描画**: Canvas 2D + SVG

## セットアップ

### 必要要件

- iPhone (iOS 13以降推奨)
- Safari ブラウザ
- HTTPS環境（カメラアクセスに必須）

### ローカル開発

1. **リポジトリをクローン**

```bash
cd /Users/tianyihan/repository/4-BW_image-J/webapp
```

2. **ローカルサーバーを起動**

HTTPSが必要なため、以下のいずれかの方法でサーバーを起動：

**方法A: Pythonの簡易サーバー（開発用）**

```bash
# Python 3の場合
python3 -m http.server 8000
```

その後、iPhoneとMacを同じWi-Fiに接続し、MacのIPアドレスを確認：

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

iPhoneのSafariで `http://[MacのIPアドレス]:8000` にアクセス

> ⚠️ 注意: HTTPではカメラアクセスができないため、本番環境ではHTTPSが必須です

**方法B: ngrok（HTTPS対応）**

```bash
# ngrokをインストール（Homebrewの場合）
brew install ngrok

# サーバー起動
python3 -m http.server 8000

# 別のターミナルでngrokを起動
ngrok http 8000
```

ngrokが表示するHTTPS URLにiPhoneのSafariでアクセス

### デプロイ

#### GitHub Pagesへのデプロイ

1. GitHubリポジトリを作成
2. `webapp`ディレクトリの内容をプッシュ
3. Settings > Pages > Source を `main` ブランチに設定
4. 数分後、`https://[username].github.io/[repo-name]/` でアクセス可能

#### Vercelへのデプロイ

1. [Vercel](https://vercel.com)にサインアップ
2. 新規プロジェクトを作成
3. GitHubリポジトリを接続
4. Root Directoryを `webapp` に設定
5. デプロイ

## 使用方法

### 1. 被験者情報入力

- 被験者ID（必須）
- 測定者ID（任意）
- 測定側（左脚/右脚）
- 測定種別（足関節背屈角度/膝窩角度）

### 2. カメラ撮影

1. **水平仪を有効化** - デバイスの傾きをリアルタイム表示
2. **4ステップ確認**
   - Step 1: 足をガイド枠内に配置
   - Step 2: 踵が床に接地
   - Step 3: 足が平ら
   - Step 4: 距離3mを確認
3. **撮影** - 全ステップ完了後、撮影ボタンが有効化

### 3. 角度測定

- 画像上で3点をタップ
  1. 腓骨頭
  2. 外果
  3. 第5中足骨頭
- 角度が自動計算される
- ポイントをドラッグして微調整可能

### 4. データエクスポート

- **CSV形式**: 統計解析用
- **JSON形式**: 詳細データ
- **画像**: 原画像 + オーバーレイ画像

## データ構造

```javascript
{
  session_id: "session_1234567890_abc123",
  subject_id: "P001",
  operator_id: "OT_yamada",
  side: "L",
  posture: "sitting",
  distance_m: 3.0,
  measurement_type: "ankle_dorsiflexion",
  checklist: {
    foot_in_frame: true,
    heel_on_ground: true,
    foot_flat: true,
    distance_confirmed: "appropriate"
  },
  device_orientation: {
    pitch_deg: 1.2,
    roll_deg: -0.8,
    is_level: true,
    level_tolerance_deg: 5.0
  },
  points: [
    { label: "fibular_head", x: 234, y: 156 },
    { label: "lateral_malleolus", x: 245, y: 312 },
    { label: "5th_metatarsal", x: 312, y: 345 }
  ],
  angle_value: 18.5,
  timestamp: "2026-01-05T14:32:15+09:00",
  device_info: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)..."
}
```

## トラブルシューティング

### カメラが起動しない

- **HTTPSで接続しているか確認** - `http://` ではなく `https://` でアクセス
- **カメラ許可を確認** - Safari設定 > プライバシーとセキュリティ > カメラ
- **他のアプリでカメラを使用していないか確認**

### 水平仪が動作しない

- **権限を許可** - 「モーションとセンサーへのアクセス」を許可
- **iOS 13以降** - 明示的な許可が必要
- **デバイスを動かす** - センサーが反応するまで少し待つ

### データが保存されない

- **プライベートブラウズモードを無効化** - IndexedDBが使用できない
- **ストレージ容量を確認** - 十分な空き容量があるか確認

## ブラウザ互換性

| ブラウザ | 対応状況 |
|---------|---------|
| iPhone Safari 13+ | ✅ 完全対応 |
| iPhone Safari 12以前 | ⚠️ 一部機能制限 |
| Android Chrome | ❌ 未対応（MVP） |
| Desktop Safari | ⚠️ カメラのみ動作 |

## ライセンス

このプロジェクトは研究・臨床用途で使用されます。

## 関連文献

1. 中嶋 風華, 中山 智晴, 山﨑 裕司: Image Jを用いた関節可動域測定における検者内再現性の検討. 高知リハビリテーション専門職大学紀要 4:23-26, 2023.
2. [MDN Web Docs - getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
3. [WebKit Blog - WebRTC on Safari](https://webkit.org/blog/11353/webrtc-in-safari-14-and-ios-14/)

## サポート

問題が発生した場合は、GitHubのIssuesで報告してください。
