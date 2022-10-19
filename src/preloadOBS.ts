import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  onPhraseFromMain: (callback: (event: any, phrase: string) => undefined) =>
    ipcRenderer.on('phraseFromMain', callback),
});

// to get typing support
declare global {
  interface Window {
    electronAPI: {
      onPhraseFromMain: (
        callback: (event: any, phrase: string) => undefined
      ) => undefined;
    };
  }
}
