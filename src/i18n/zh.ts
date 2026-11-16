export const zh = {
  htmlLang: 'zh-Hant',
  siteTitle: '影片工具箱',
  langSwitchLabel: '語言',
  listSep: '、',
  privacy: '所有處理都在你的瀏覽器內完成，影片不會上傳到任何伺服器。',
  consent: {
    title: '隱私設定',
    text: '本站使用 Google Analytics 統計瀏覽次數與功能使用情況，用來改善網站。不會收集你的影片或檔名，影片仍然只在你的瀏覽器內處理。',
    accept: '同意',
    deny: '拒絕',
    settings: '隱私設定',
  },
  common: {
    download: '下載',
    share: '分享 / 儲存到相簿',
    shareFailed: '無法開啟分享選單，請改用「下載」。',
    shareHint: '手機請點「分享 / 儲存到相簿」存進相簿。',
    reselect: '重新選擇影片',
    cancel: '取消',
  },
  dropzone: {
    hint: '拖放影片到這裡，或點擊選擇檔案（支援 MP4、MOV、WebM、MKV 等常見格式）',
    singleOnly: '一次只能處理一部影片，請只選擇一部。',
    tooBig: (count: number, mb: number, names: string) =>
      `已略過 ${count} 個過大的檔案（單檔上限 ${mb} MB）：${names}`,
    rejected: (count: number, names: string) => `已略過 ${count} 個不是影片的檔案：${names}`,
  },
  engine: {
    note: (mb: number) =>
      `第一次處理時，會先下載影片處理引擎（約 ${mb} MB），之後瀏覽器會自動快取。`,
    downloading: '下載影片處理引擎',
    initializing: '啟動影片處理引擎…',
    running: '處理中',
  },
  errors: {
    generic: '處理失敗',
    engineLoadFailed: '無法載入影片處理引擎，請檢查網路連線後重試。',
    processFailed: '無法處理這部影片，請確認檔案是否正確，或換一部影片試試。',
    outOfMemory: (mb: number) =>
      `記憶體不足，無法處理這部影片。請改選較小的影片（建議在 ${mb} MB 以下），或改用電腦。`,
  },
  gif: {
    dropLabel: '選擇要轉成 GIF 的影片',
    previewTitle: '原始影片',
    settingsTitle: 'GIF 設定',
    startLabel: '起點（秒）',
    useCurrent: '用目前播放位置',
    durationLabel: '長度',
    durationOption: (seconds: number) => `${seconds} 秒`,
    fpsLabel: '幀率',
    fpsOption: (fps: number) => `${fps} fps`,
    widthLabel: '寬度',
    widthOption: (width: number) => `${width} px`,
    start: '開始轉換',
    resultTitle: 'GIF 結果',
    resultAlt: '轉換後的 GIF',
    sizeNote: (max: number) =>
      `GIF 檔案會比影片大很多，所以一次最多轉 ${max} 秒。想讓檔案小一點，可以降低幀率、寬度或縮短長度。`,
    outputNote: '只轉換畫面，不含聲音。',
  },
}

export type Messages = typeof zh
