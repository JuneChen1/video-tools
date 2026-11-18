import type { Messages } from './zh'

export const ja: Messages = {
  htmlLang: 'ja',
  siteTitle: '動画ツールボックス',
  langSwitchLabel: '言語',
  listSep: '、',
  privacy: 'すべてブラウザ内で処理されます。動画がサーバーにアップロードされることはありません。',
  consent: {
    title: 'プライバシー設定',
    text: 'このサイトでは、サイトの改善のために Google Analytics で閲覧数や機能の利用状況を集計しています。動画やファイル名は収集されず、動画はこれまでどおりブラウザ内だけで処理されます。',
    accept: '同意する',
    deny: '同意しない',
    settings: 'プライバシー設定',
  },
  common: {
    download: 'ダウンロード',
    share: '共有',
    shareFailed: '共有メニューを開けませんでした。「ダウンロード」をご利用ください。',
    shareHint: 'スマホでは「共有」をタップして、写真アプリに保存してください。',
    reselect: '別の動画を選ぶ',
    cancel: 'キャンセル',
  },
  dropzone: {
    hint: 'ここに動画をドラッグ＆ドロップ、またはクリックしてファイルを選択（MP4、MOV、WebM、MKV などに対応）',
    singleOnly: '一度に処理できる動画は 1 本だけです。1 本だけ選んでください。',
    tooBig: (count, mb, names) =>
      `サイズが大きすぎるファイルを ${count} 件スキップしました（1 ファイルの上限 ${mb} MB）：${names}`,
    rejected: (count, names) => `動画ではないファイルを ${count} 件スキップしました：${names}`,
  },
  engine: {
    note: (mb) =>
      `初回の処理時に、動画処理エンジン（約 ${mb} MB）をダウンロードします。2 回目以降はブラウザのキャッシュが使われます。`,
    downloading: '動画処理エンジンをダウンロード中',
    initializing: '動画処理エンジンを起動中…',
    running: '処理中',
  },
  errors: {
    generic: '処理に失敗しました',
    engineLoadFailed: '動画処理エンジンを読み込めませんでした。接続を確認して、もう一度お試しください。',
    processFailed: 'この動画を処理できませんでした。ファイルをご確認いただくか、別の動画をお試しください。',
    outOfMemory: (mb) =>
      `メモリが不足して、この動画を処理できません。より小さい動画（${mb} MB 以下を推奨）を選ぶか、パソコンをご利用ください。`,
  },
  gif: {
    dropLabel: 'GIF に変換する動画を選択',
    previewTitle: '元の動画',
    settingsTitle: 'GIF 設定',
    startLabel: '開始位置（秒）',
    useCurrent: '現在の再生位置を使う',
    durationLabel: '長さ',
    durationOption: (seconds) => `${seconds} 秒`,
    fpsLabel: 'フレームレート',
    fpsOption: (fps) => `${fps} fps`,
    widthLabel: '幅',
    widthOption: (width) => `${width} px`,
    start: '変換を開始',
    resultTitle: '結果',
    sizeLabel: 'ファイルサイズ',
    resultAlt: '変換後の GIF',
    sizeNote: (max) =>
      `GIF は動画よりファイルサイズがかなり大きくなるため、一度に変換できるのは最大 ${max} 秒です。ファイルサイズを小さくしたい場合は、フレームレートや幅を下げるか、長さを短くしてください。`,
    outputNote: '映像のみを変換します（音声は含まれません）。',
  },
}
