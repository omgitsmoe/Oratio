import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  startEmoteDownload: (channel: string, global?: boolean) => {
    ipcRenderer.send('downloadEmotes', channel, global);
  },
  onEmoteDownloadProgress: (
    callback: (event: IpcRendererEvent, type: string, message: string) => void
  ) => ipcRenderer.on('emoteDownloadProgress', callback),
  onUpdateEmoteMap: (
    callback: (
      event: IpcRendererEvent,
      emoteNameToUrl: { [key: string]: string }
    ) => void
  ) => ipcRenderer.on('updateEmoteMap', callback),
  importEmoteMapFromDisk: () => ipcRenderer.send('importEmoteMapFromDisk'),

  startAuthLoopBack: (channel: string) =>
    ipcRenderer.send('authLoopback', channel),

  onReceiveTwitchToken: (callback: (event: IpcRendererEvent) => void) =>
    ipcRenderer.on('receivedToken', callback),
});

// to get typing support
declare global {
  interface Window {
    electronAPI: {
      startEmoteDownload: (channel: string, global?: boolean) => void;

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
          emoteNameToUrl: { [key: string]: string }
        ) => void
      ) => void;

      importEmoteMapFromDisk: () => void;

      startAuthLoopBack: (channel: string) => void;

      onReceiveTwitchToken: (
        callback: (event: IpcRendererEvent) => void
      ) => void;
    };
  }
}
