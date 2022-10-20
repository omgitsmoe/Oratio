import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('mainToOBS', {
  onPhraseFromMain: (
    callback: (event: IpcRendererEvent, phrase: string) => void
  ) => ipcRenderer.on('phraseFromMain', callback),
});

// to get typing support
declare global {
  interface Window {
    mainToOBS: {
      onPhraseFromMain: (
        callback: (event: IpcRendererEvent, phrase: string) => void
      ) => void;
    };
  }
}
