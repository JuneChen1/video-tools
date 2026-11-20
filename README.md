# 影片工具箱 (Video Toolbox)

> **線上影片處理工具**  
> 影片轉 GIF、剪輯影片，全部在瀏覽器內處理，**影片不會上傳到任何伺服器**。

🔗 前往網頁：https://videotools.junenaga.com

---

## 主要功能 (Features)

### 影片轉 GIF (Video to GIF)
* **選取片段**：可指定起點（秒），也可以用「目前播放位置」當起點；長度 3 / 5 / 10 秒（預設 5 秒）。
* **幀率**：5 / 10 / 15 fps（預設 10）。
* **寬度**：320 / 480 / 640 px（預設 480），來源比較窄時不放大。
* **畫質**：兩階段調色盤（依該片段的顏色產生最佳 256 色），比預設調色盤清晰。
* **只轉換畫面**，GIF 不含聲音。

### 剪輯影片 (Trim)
* **起點與終點**：以秒為單位（精度 0.1 秒），終點預設是影片結尾；也可以用「目前播放位置」設定。
* **快速模式（預設）**：不重新編碼（`-c copy`），速度很快、畫質完全不變；但只能從關鍵影格切，起點可能比設定的早幾秒。輸出沿用原本的容器（MP4、MOV、MKV、WebM），其他格式輸出 MP4。
* **精準模式**：重新編碼成 H.264 + AAC 的 MP4，起點與終點都很準確，但單執行緒 wasm 速度較慢，片段越長要等越久。
* 保留所有影像與音軌，丟掉字幕與資料軌（例如 iPhone 的時間碼軌，封裝進 MP4 會失敗）。

---

## 上傳規則與限制 (Upload Limits)

| 限制項目 | 規格 | 說明 / 超過處理機制 |
| :--- | :--- | :--- |
| **單檔大小** | **650 MB**（`src/utils/limits.ts` 的 `MAX_FILE_MB`） | 在選檔當下、載入 ffmpeg **之前**就檢查，超過會拒絕並顯示上限。桌機 Chrome 實測 600 MB（8 分 16 秒 1080p）轉 GIF、快速剪輯都正常；手機尚未實測 |
| **數量** | 一次 1 部 | 選了多部會整批不處理並提示 |
| **格式** | MP4、MOV、M4V、WebM、MKV、AVI、3GP | 不是影片的檔案會略過並提示 |
| **GIF 長度** | 最長 10 秒 | 起點加長度超過影片長度時自動縮短 |

> 影片壓縮功能曾實作並實測過，但單執行緒 wasm 太慢（6 秒 720p 約 100～150 秒），加上當時的 100 MB 上限實用性不高，所以先移除，等換成多執行緒或更快的方案再考慮加回。

---

## 隱私 (Privacy)

* 所有影片處理都在使用者的瀏覽器內完成（WebAssembly），**檔案不會離開裝置**。
* Google Analytics（GA4）只有在使用者按「同意」後才載入；事件只包含工具名稱、格式縮寫、設定選項這類固定值，**絕不帶檔名、影片內容、尺寸**。頁尾可隨時重新選擇。
* 衡量 ID 由環境變數 `VITE_GA_ID` 提供；沒有設定時，網站完全不載入 GA，也不顯示同意橫幅。

---

## 專案技術 (Tech Stack)

**純前端、沒有後端。**

| 類別 | 技術 | 用途 |
| :--- | :--- | :--- |
| **前端框架** | React 19 + TypeScript | 介面與狀態管理 |
| **建置工具** | Vite 8 | 開發伺服器與打包 |
| **影片處理** | `@ffmpeg/ffmpeg` 0.12（WebAssembly） + `@ffmpeg/core` 0.12.10 **單執行緒版** | 轉 GIF、剪輯影片。`@ffmpeg/ffmpeg` 會自己開 Web Worker 執行，介面不會被卡住 |
| **核心檔案** | `ffmpeg-core.wasm`（約 30.74 MiB）+ `ffmpeg-core.js` | 由本站自己提供（`public/ffmpeg/`，建置時由 `scripts/copy-ffmpeg.mjs` 從 `node_modules` 複製，不進 git）。只在使用者按下開始處理後才下載，並顯示下載進度；首頁不會下載 |
| **多語系** | 自製輕量字典 + 網址路徑 | zh / en / ja，建置後由 `scripts/postbuild.mjs` 產生各語言頁面、`404.html`、sitemap、canonical、hreflang |
| **樣式** | 純 CSS | 沿用圖片工具箱的「瑞士極簡」風格，亮 / 暗色依系統設定自動切換 |
| **程式碼檢查** | oxlint | 靜態檢查 |
| **自動化測試** | Vitest | 測 ffmpeg 指令組裝、選檔規則與大小上限、字典、統計事件等純邏輯 |
| **部署** | GitHub Pages（GitHub Actions） | 純靜態網站，網域 `videotools.junenaga.com` |

### 為什麼用單執行緒版核心

多執行緒版（`@ffmpeg/core-mt`）需要 `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` 標頭，GitHub Pages 無法設定，也可能擋掉 Google Analytics。所以先用單執行緒版；速度比桌面軟體慢，若實測太慢再考慮換託管平台。

### 常用指令

```bash
npm run dev       # 開發伺服器（會先複製 ffmpeg 核心）
npm run build     # 複製核心 + 型別檢查 + 建置 + 產生各語言頁面
npm run preview   # 預覽建置結果
npm run lint      # 程式碼檢查
npm test          # 執行自動化測試
```

---

## 結構

```
video-tools/
├─ public/
│  └─ favicon.ico 等網站圖示、site.webmanifest（ffmpeg/ 由腳本產生，不進 git）
├─ scripts/
│  ├─ copy-ffmpeg.mjs      把 ffmpeg 核心從 node_modules 複製到 public/ffmpeg/
│  └─ postbuild.mjs        建置後產生 /zh/、/en/、/ja/ 頁面、404.html 與 sitemap
├─ src/
│  ├─ components/
│  │  ├─ Dropzone.tsx      拖放上傳區（在載入 ffmpeg 前檢查格式與大小）
│  │  ├─ Progress.tsx      進度：細線 + 等寬數字
│  │  ├─ ResultActions.tsx 下載 / 分享
│  │  └─ ShareHint.tsx     手機上的「儲存到相簿」說明
│  ├─ features/
│  │  ├─ GifTab.tsx        影片轉 GIF
│  │  ├─ TrimTab.tsx       剪輯影片
│  │  └─ hooks.ts          處理狀態（進度、取消、結果）與預覽網址
│  ├─ i18n/                中、英、日字典與語言狀態
│  ├─ utils/
│  │  ├─ ffmpeg.ts         載入核心（含進度）、在 Worker 內執行、取消
│  │  ├─ ffmpegArgs.ts     組 ffmpeg 指令列（純函式）
│  │  ├─ selectFiles.ts    上傳篩選規則
│  │  ├─ limits.ts         大小與 GIF 選項上限（單一來源）
│  │  └─ video.ts          錯誤型別與小工具
│  ├─ analytics*.ts、consent.ts   GA4 與同意狀態
│  └─ *.test.ts            測試檔，放在被測檔案旁邊（Vitest）
└─ package.json、vite.config.ts、tsconfig*.json
```

---

## 本地開發環境架設

**環境需求**：[Node.js](https://nodejs.org/) **22.12 以上**（本專案以 Node 24 開發）。

```bash
git clone https://github.com/JuneChen1/video-tools.git
cd video-tools
npm install
npm run dev
```

---

## 授權與散布義務 (Licenses)

本站的原始碼與依賴的授權如下。**`@ffmpeg/core` 是 GPL-2.0-or-later**，而本站會把它的 wasm 檔案原封不動地提供給使用者下載，因此需要遵守：

| 套件 | 用途 | 授權 |
| :--- | :--- | :--- |
| [`@ffmpeg/ffmpeg`](https://github.com/ffmpegwasm/ffmpeg.wasm) | 在瀏覽器內呼叫 ffmpeg 的 JavaScript 封裝 | MIT |
| [`@ffmpeg/core`](https://github.com/ffmpegwasm/ffmpeg.wasm/tree/main/packages/core)（0.12.10，單執行緒版） | FFmpeg 編譯成 WebAssembly（內含 x264 等編碼器） | GPL-2.0-or-later |
| [FFmpeg](https://ffmpeg.org/) / [x264](https://www.videolan.org/developers/x264.html) | 影片編解碼 | LGPL-2.1+ / GPL-2.0+ |

散布義務（GPL）與本專案的作法：

* **提供對應原始碼**：`@ffmpeg/core` 的原始碼與建置方式公開於 ffmpeg.wasm 專案（連結如上），本站提供的 `ffmpeg-core.wasm` 與 `ffmpeg-core.js` 未經修改，直接取自 npm 套件 `@ffmpeg/core@0.12.10`。
* **保留授權聲明並告知使用者**：README 列出依賴與授權；網站頁尾可再加上授權說明連結（待辦）。
* **只用不改**：本站以「獨立檔案、由網頁呼叫」的方式使用 ffmpeg-core，沒有修改其原始碼；如果日後自行修改或重新編譯核心，必須一併公開修改後的原始碼。
* 本站自身的程式碼（React 介面等）與核心是分開的檔案，透過 Worker 訊息溝通。GPL 對「網站程式碼是否須一併以 GPL 釋出」在業界仍有爭議，若要完全避開疑慮，可改為只使用 LGPL 組建的 FFmpeg（但該組建不含 x264，需改用其他編碼器），此為待決定事項。

> 以上為專案作者的整理，不是法律意見；若有商業用途或疑慮，請諮詢專業人士。

---

## 致謝與協作 (Acknowledgments)
* **AI 協作開發**  
  本專案全流程由 **Claude Code** 輔助架構設計與程式碼編寫。

* **介面與樣式規範**  
  前端視覺風格沿用圖片工具箱（[image-tools](https://github.com/JuneChen1/image-tools)），採用 [Claude Code Skill 設計風格圖鑑 · 島嶼共鳴 2026](https://www.casper.tw/claude-skill-design-gallery/) 範例開發。
