/**
 * 單一影片檔案大小上限。在選檔當下（載入 ffmpeg 之前）就檢查，只要改這裡。
 * 影片是用 WORKERFS 掛載，ffmpeg 讀取時才從 File 取資料，輸入檔不佔 wasm 記憶體；
 * 吃記憶體的是輸出檔（放在 wasm 記憶體內，讀出時再複製幾份）。
 * 2026-11-21 在桌機 Chrome 實測 600.5 MB（8 分 16 秒 1080p）：轉 GIF 約 3 秒、
 * 快速剪輯整支輸出 599.7 MB 約 6 秒，都沒問題。手機尚未實測，若有問題就調低。
 * 不設成剛好 600：Windows 檔案總管顯示「600 MB」的檔案可能是 600.47 MiB，會被自己擋掉
 */
export const MAX_FILE_MB = 650
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024

/** WORKERFS 掛載失敗時的退路是把整個檔案讀進記憶體，只允許小檔案，大檔案直接回報記憶體不足 */
export const MEMORY_FALLBACK_MAX_BYTES = 100 * 1024 * 1024

/** 轉 GIF 的選項。GIF 檔案大小大約和「寬度² × 幀率 × 秒數」成正比，三個一起限制才不會暴增 */
export const GIF_DURATION_CHOICES = [3, 5, 10] as const
export const GIF_FPS_CHOICES = [5, 10, 15] as const
export const GIF_WIDTH_CHOICES = [320, 480, 640] as const

export const GIF_DEFAULT_DURATION = 5
export const GIF_DEFAULT_FPS = 10
export const GIF_DEFAULT_WIDTH = 480

/** GIF 最長秒數（選項中最大者）；起點加上這個長度超過影片長度時，會自動縮短 */
export const GIF_MAX_SECONDS = Math.max(...GIF_DURATION_CHOICES)
