import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  startEmoteDownload: (
    authorizedChannel: string,
    channel: string | null,
    global: boolean
  ) => {
    ipcRenderer.send('downloadEmotes', authorizedChannel, channel, global);
  },
  onEmoteDownloadProgress: (
    callback: (event: IpcRendererEvent, type: string, message: string) => void
  ) => ipcRenderer.on('emoteDownloadProgress', callback),
  onUpdateEmoteMap: (
    callback: (
      event: IpcRendererEvent,
      emoteNameToUrl: { [key: string]: string },
      writeToDisk: boolean
    ) => void
  ) => ipcRenderer.on('updateEmoteMap', callback),
  onMergeEmoteMap: (
    callback: (
      event: IpcRendererEvent,
      emoteNameToUrl: { [key: string]: string }
    ) => void
  ) => ipcRenderer.on('mergeEmoteMap', callback),
  importEmoteMapFromDisk: () => ipcRenderer.send('importEmoteMapFromDisk'),

  exportEmoteMap: (emoteMap: { [key: string]: string }) =>
    ipcRenderer.invoke('exportEmoteMap', emoteMap),

  startAuthLoopBack: (channel: string) =>
    ipcRenderer.send('authLoopback', channel),

  onReceiveTwitchToken: (callback: (event: IpcRendererEvent) => void) =>
    ipcRenderer.on('receivedToken', callback),

  getTwitchToken: (channel: string) =>
    ipcRenderer.invoke('getTwitchToken', channel),

  getTwitchTokenSync: (channel: string) =>
    ipcRenderer.sendSync('getTwitchTokenSync', channel),

  openFileExplorer: (openPath: string) =>
    ipcRenderer.send('openFileExplorer', openPath),

  getDirListingSounds: () => ipcRenderer.invoke('getDirListingSounds'),

  getAzureKey: () => ipcRenderer.invoke('getAzureKey'),

  sendAzureKey: (key: string) => ipcRenderer.send('setAzureKey', key),

  openOBSWindow: () => ipcRenderer.send('openOBSWindow'),

  sendPhraseOBSWindow: (phrase: string) =>
    ipcRenderer.send('sendSpeechOBSWindow', phrase),

  getTTSCache: () => ipcRenderer.invoke('getTTSCache'),

  updateTTSCache: (json: string) => ipcRenderer.send('updateTTSCache', json),

  copyToClipboard: (value: string) =>
    ipcRenderer.send('copyToClipboard', value),
});

// NOTE: since we load the OBS window over react-dom-router as part of the
// main renderer index.html all of the includes of App.tsx also get executed
// (at least the top-level parts), which will fail if it reaches a top-level
// statement that uses the bridged node api of the __main__ window
// there were 3 options:
// - separate bundle for the OBS window, which is annoying and wasteful for a feature
//   has been superseeded by the browsersource
// - don't use the bridged api (by the preload script) at the top-level of files
// - just use the same preload script
// => last best option, since the only exposure to external webcontent is at least the
//    the same as the main window, so having more bridged api available shouldn't matter
contextBridge.exposeInMainWorld('mainToOBS', {
  onPhraseFromMain: (
    callback: (event: IpcRendererEvent, phrase: string) => void
  ) => ipcRenderer.on('phraseFromMain', callback),
});

// to get typing support
declare global {
  interface Window {
    electronAPI: {
      startEmoteDownload: (
        authorizedChannel: string,
        channel: string | null,
        global: boolean
      ) => void;

      onEmoteDownloadProgress: (
        callback: (
          event: IpcRendererEvent,
          type: string,
          message: string
        ) => void
      ) => void;

      onUpdateEmoteMap: (
        callback: (
          event: IpcRendererEvent,
          emoteNameToUrl: { [key: string]: string },
          writeToDisk: boolean
        ) => void
      ) => void;

      onMergeEmoteMap: (
        callback: (
          event: IpcRendererEvent,
          emoteNameToUrl: { [key: string]: string }
        ) => void
      ) => void;

      importEmoteMapFromDisk: () => void;

      exportEmoteMap: (emoteMap: { [key: string]: string }) => Promise<boolean>;

      startAuthLoopBack: (channel: string) => void;

      onReceiveTwitchToken: (
        callback: (event: IpcRendererEvent) => void
      ) => void;

      getTwitchToken: (channel: string) => Promise<string | null>;

      getTwitchTokenSync: (channel: string) => string | null;

      openFileExplorer: (openPath: string) => void;

      getDirListingSounds: () => Promise<string[]>;

      getAzureKey: () => Promise<string | null>;

      sendAzureKey: (key: string) => void;

      openOBSWindow: () => void;

      sendPhraseOBSWindow: (phrase: string) => void;

      getTTSCache: () => Promise<string | undefined>;

      updateTTSCache: (json: string) => void;

      copyToClipboard: (value: string) => void;
    };

    mainToOBS: {
      onPhraseFromMain: (
        callback: (event: IpcRendererEvent, phrase: string) => void
      ) => void;
    };
  }
}
