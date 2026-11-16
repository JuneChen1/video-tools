/**
 * 單一影片檔案大小上限。在選檔當下（載入 ffmpeg 之前）就檢查。
 * ffmpeg.wasm 在瀏覽器記憶體內處理，手機與低階裝置容易爆記憶體，所以保守一點；
 * 之後依實測調整，只要改這裡
 */
export const MAX_FILE_MB = 100
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024

/** 轉 GIF 的選項。GIF 檔案大小大約和「寬度² × 幀率 × 秒數」成正比，三個一起限制才不會暴增 */
export const GIF_DURATION_CHOICES = [3, 5, 10] as const
export const GIF_FPS_CHOICES = [5, 10, 15] as const
export const GIF_WIDTH_CHOICES = [320, 480, 640] as const

export const GIF_DEFAULT_DURATION = 5
export const GIF_DEFAULT_FPS = 10
export const GIF_DEFAULT_WIDTH = 480

/** GIF 最長秒數（選項中最大者）；起點加上這個長度超過影片長度時，會自動縮短 */
export const GIF_MAX_SECONDS = Math.max(...GIF_DURATION_CHOICES)
