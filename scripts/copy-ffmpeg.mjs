// 把單執行緒版 ffmpeg 核心從 node_modules 複製到 public/ffmpeg/，由網站自己提供（不走第三方 CDN）。
// ffmpeg-core.wasm 約 31 MB，不放進 git，每次 dev / build 前由這個腳本複製（見 package.json 的 predev、prebuild）。
// 使用 esm 版：@ffmpeg/ffmpeg 的 Worker 是 module 型態，用動態 import 載入核心。
import { copyFileSync, mkdirSync, statSync } from 'node:fs'

const FROM = 'node_modules/@ffmpeg/core/dist/esm'
const TO = 'public/ffmpeg'
const FILES = ['ffmpeg-core.js', 'ffmpeg-core.wasm']

mkdirSync(TO, { recursive: true })
for (const name of FILES) {
  copyFileSync(`${FROM}/${name}`, `${TO}/${name}`)
}
const mib = (statSync(`${TO}/ffmpeg-core.wasm`).size / 1024 / 1024).toFixed(2)
console.log(`copy-ffmpeg: copied ${FILES.join(', ')} to ${TO} (wasm ${mib} MiB)`)
