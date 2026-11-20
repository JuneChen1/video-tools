import type { Messages } from './zh'

export const en: Messages = {
  htmlLang: 'en',
  siteTitle: 'Video Toolbox',
  langSwitchLabel: 'Language',
  listSep: ', ',
  privacy: 'Everything is processed in your browser. Your videos are never uploaded to any server.',
  tabs: { gif: 'Video to GIF', trim: 'Video Trimmer' },
  consent: {
    title: 'Privacy Settings',
    text: 'This site uses Google Analytics to count visits and see which features are used, to improve the site. Your videos and file names are never collected, and videos are still processed only in your browser.',
    accept: 'Accept',
    deny: 'Decline',
    settings: 'Privacy Settings',
  },
  common: {
    download: 'Download',
    share: 'Share',
    shareFailed: 'Could not open the share sheet. Please use Download instead.',
    shareHint: 'On a phone, tap “Share” to save it to your photo library.',
    reselect: 'Choose another video',
    cancel: 'Cancel',
    busyElsewhere: 'Another tab is processing a video. Please wait for it to finish.',
  },
  dropzone: {
    hint: 'Drop a video here, or click to choose a file (MP4, MOV, WebM, MKV and other common formats)',
    singleOnly: 'Only one video can be processed at a time. Please choose just one.',
    tooBig: (count, mb, names) =>
      `Skipped ${count} oversized ${count === 1 ? 'file' : 'files'} (limit ${mb} MB per file): ${names}`,
    rejected: (count, names) =>
      `Skipped ${count} ${count === 1 ? 'file that is' : 'files that are'} not video: ${names}`,
  },
  engine: {
    note: (mb) =>
      `The first time you process a video, the video engine (about ${mb} MB) is downloaded. After that your browser caches it.`,
    downloading: 'Downloading video engine',
    initializing: 'Starting video engine…',
    running: 'Processing',
  },
  errors: {
    generic: 'Something went wrong',
    engineLoadFailed: 'Could not load the video engine. Please check your connection and try again.',
    processFailed: 'Could not process this video. Please check the file or try another video.',
    outOfMemory:
      'Not enough memory to process this. Try a smaller video, a shorter clip, or use a computer.',
  },
  gif: {
    dropLabel: 'Choose a video to convert to GIF',
    previewTitle: 'Original video',
    settingsTitle: 'GIF settings',
    startLabel: 'Start (seconds)',
    useCurrent: 'Use current playback position',
    durationLabel: 'Duration',
    durationOption: (seconds) => `${seconds} s`,
    fpsLabel: 'Frame rate',
    fpsOption: (fps) => `${fps} fps`,
    widthLabel: 'Width',
    widthOption: (width) => `${width} px`,
    start: 'Convert to GIF',
    resultTitle: 'Result',
    sizeLabel: 'File size',
    resultAlt: 'Converted GIF',
    sizeNote: (max) =>
      `GIFs are much larger than videos, so conversion is limited to ${max} seconds at a time. To make the file smaller, lower the frame rate or width, or shorten the duration.`,
    outputNote: 'Only the video is converted. Audio is not included.',
  },
  trim: {
    dropLabel: 'Choose a video to trim',
    previewTitle: 'Original video',
    settingsTitle: 'Trim settings',
    startLabel: 'Start (seconds)',
    endLabel: 'End (seconds)',
    useCurrent: 'Use current playback position',
    modeLabel: 'Method',
    mode: { fast: 'Fast', precise: 'Precise' },
    fastNote:
      'Fast: quick, and the quality stays exactly the same, but it can only cut at certain points in the video, so the start may be a few seconds earlier than set.',
    preciseNote:
      'Precise: the start and end are exact, but it is slower. The longer the clip, the longer you wait.',
    rangeInvalid: 'The end must be later than the start.',
    start: 'Trim video',
    resultTitle: 'Result',
    sizeLabel: 'File size',
  },
}
