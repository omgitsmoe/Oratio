/* eslint global-require: off, no-console: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./src/main.prod.js` using webpack. This gives us some performance wins.
 */
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import path from 'path';
import child_process from 'child_process';
import {
  app,
  BrowserWindow,
  shell,
  globalShortcut,
  ipcMain,
  dialog,
  IpcMainEvent,
  IpcMainInvokeEvent,
  clipboard,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import keytar from 'keytar';
import * as fs from 'fs';
import openExplorer from 'open-file-explorer';
import { uIOhook, UiohookKey } from 'uiohook-napi';
import MenuBuilder from './menu';
import TwitchAuth from './TwitchAuth';
import {
  downloadEmotes,
  updateEmoteMap,
  importEmoteLibFromDisk,
  exportEmoteLib,
} from './EmoteLib';
import { uioEventToElectronKeyCode, shiftPressed } from './utils';

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}
// app.disableHardwareAcceleration();
// app.commandLine.appendSwitch('disable-gpu-compositing');
// app.commandLine.appendSwitch('disable-gpu');
let mainWindow: BrowserWindow | null = null;
let ioEventsInitialized = false;
let ioIsHooked = false;
const isMac = process.platform === 'darwin';
const controlKeyStr = isMac ? 'command' : 'control';
const isDevEnv = process.env.NODE_ENV === 'development';

const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '../assets');

const getAssetPath = (...paths: string[]): string => {
  return path.join(RESOURCES_PATH, ...paths);
};

const cacheFile = getAssetPath('cache.json');
let cacheJSON: string | undefined;

// NOTE: data that is sent over IPC is serialized, so sending an instance of a class
// won't work unless it can be fulle serialized and re-serialized
// -> just load the json and set that back and forth using ipc
async function loadCacheFile() {
  try {
    cacheJSON = fs.readFileSync(cacheFile, 'utf-8');
  } catch {
    // cache file does not exist
    cacheJSON = '{ "capacity": 100, "entries": [] }';
  }
}

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (isDevEnv || process.env.DEBUG_PROD === 'true') {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDevEnv || process.env.DEBUG_PROD === 'true') {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 860,
    height: 850,
    icon: getAssetPath('icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preloadMain.js')
        : path.join(__dirname, '../.erb/dll/preloadMain.js'),
    },
  });

  if (isDevEnv) {
    mainWindow.loadURL(
      `http://localhost:${
        process.env.PORT || '1212'
      }/dist/index_injected.html#/home`
    );
  } else {
    mainWindow.loadURL(`file://${__dirname}/index_injected.html#/home`);
  }

  // TODO remove
  // mainWindow.webContents.openDevTools();

  /**
   * Add event listeners...
   */

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('closed', () => {
    // write cache file on close
    if (cacheJSON) fs.writeFileSync(cacheFile, cacheJSON);

    // mainWindow = null;
    if (!isMac) {
      app.quit();
    }
    if (ioIsHooked) uIOhook.stop();

    globalShortcut.unregisterAll();
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

function registerUIHookEvents() {
  uIOhook.on('keydown', (e) => {
    // don't send modifier keys by themselves
    if (
      e.keycode === UiohookKey.Shift ||
      e.keycode === UiohookKey.ShiftRight ||
      e.keycode === UiohookKey.Alt ||
      e.keycode === UiohookKey.AltRight ||
      e.keycode === UiohookKey.Ctrl ||
      e.keycode === UiohookKey.CtrlRight ||
      e.keycode === UiohookKey.Meta ||
      e.keycode === UiohookKey.MetaRight
    ) {
      return;
    }
    let keyCodeStr = uioEventToElectronKeyCode(e);
    const modifiers: Electron.InputEvent['modifiers'] = [];
    const isSingleChar = keyCodeStr.length === 1;
    // add modfiers that are currently held down
    // NOTE: modifiers accepted by sendInputEvent differ from those mentioned
    // in https://www.electronjs.org/docs/latest/api/accelerator
    if (e.altKey) {
      modifiers.push('alt');
    }
    if (e.ctrlKey) {
      modifiers.push(controlKeyStr);
    }
    if (e.shiftKey) {
      modifiers.push('shift');
      // non-alpha shift mapping (numbers, ;'\[] etc.)
      if (isSingleChar) {
        keyCodeStr = shiftPressed(keyCodeStr);
      }
    } else if (isSingleChar) {
      // no shift pressed -> lowercase (electron accelerators [key 'codes'] are upppercase by default)
      keyCodeStr = keyCodeStr.toLowerCase();
    }
    if (e.metaKey) {
      modifiers.push('meta');
    }

    // emulate keypressed by sending keydown, char then keyup
    // NOTE: apparently needs to happen exactly in this order
    mainWindow?.webContents.sendInputEvent({
      type: 'keyDown',
      modifiers,
      keyCode: keyCodeStr,
    });
    // 'char' expects the actual character (respecting kb layout)
    // TODO: respect kb layout
    let charStr = keyCodeStr;
    // sending space does not work, needs literal ' '
    if (keyCodeStr === 'Space') charStr = ' ';
    // same for enter/return
    if (keyCodeStr === 'Return') charStr = '\u000d';
    mainWindow?.webContents.sendInputEvent({
      type: 'char',
      modifiers,
      keyCode: charStr,
    });
    mainWindow?.webContents.sendInputEvent({
      type: 'keyUp',
      modifiers,
      keyCode: keyCodeStr,
    });

    if (e.keycode === UiohookKey.Escape) {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      toggleIOHook();
    }
  });
}

function toggleIOHook() {
  if (!ioIsHooked) {
    if (!ioEventsInitialized) {
      registerUIHookEvents();
      ioEventsInitialized = true;
    }
    uIOhook.start();
    mainWindow?.webContents.send('onStartGlobalInputCapture');
    ioIsHooked = true;
  } else {
    uIOhook.stop();
    mainWindow?.webContents.send('onStopGlobalInputCapture');
    ioIsHooked = false;
  }
}

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (!isMac) {
    app.quit();
  }
  globalShortcut.unregisterAll();
});

app
  .whenReady()
  .then(createWindow)
  .then(() => {
    globalShortcut.register('CommandOrControl+O', () => {
      if (mainWindow?.isFocused()) {
        // Minimizing the window in a Windows OS returns focus to the original app
        // while hiding the app in a unix like OS returns focus
        if (process.platform === 'win32') {
          mainWindow?.minimize();
        } else {
          mainWindow?.hide();
        }
      } else {
        // mainWindow?.show();
        mainWindow?.focus();
      }
    });

    globalShortcut.register('CommandOrControl+L', () => {
      toggleIOHook();
    });

    // start our server in a separate process to keep main/server performance indipendent
    // NOTE: using child_process over hidden renderer/webworker since we don't need
    // access to electron on the server and a forked process might be more lightweight?
    // while a webworker might not be able to handle/use? all the things we need
    //
    // will close automatically when this process exits
    const serverProc = child_process.fork(getAssetPath('dist', 'server.js'));
    if (serverProc !== null) {
      if (serverProc.stdout !== null) {
        serverProc.stdout.on('data', (data) => {
          console.log(`server stdout:\n${data}`);
        });
      }
      if (serverProc.stderr !== null) {
        serverProc.stderr.on('data', (data) => {
          console.log(`server stderr:\n${data}`);
        });
      }

      serverProc.send({ action: 'listen', port: 4563 });
    }

    return mainWindow;
  })
  .catch(console.log);

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});

ipcMain.on('authLoopback', async (event, channelName) => {
  // NOTE: apparently it's not a good idea to use destructuring for process.env
  // -> use process.env.TWITCH_CLIENT_ID directly instead
  // eslint-disable-next-line prefer-destructuring
  const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
  if (!TWITCH_CLIENT_ID) {
    dialog.showMessageBox({
      message: "Can't authorize! Missing twitch client id!",
    });
    return;
  }

  const validPorts = [8005, 8006, 8007, 8008, 8009, 8010];
  const twitch = new TwitchAuth(validPorts, TWITCH_CLIENT_ID);
  twitch.on('allPortsInUse', () => {
    dialog.showMessageBox({
      message: `All ports (${validPorts}) in use!`,
    });
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  twitch.on('receivedToken', (accessToken: string, _tokenType: string) => {
    keytar.setPassword('Oratio-Twitch', channelName, accessToken);
    event.reply('receivedToken');
    twitch.shutDown();
  });
  await twitch.setUpLoopback();
});

export function setTwitchAuth(wc: Electron.WebContents, state: boolean) {
  wc.send('setTwitchAuth', state);
}

export async function getTwitchToken(
  channelName: string | null
): Promise<string | null> {
  if (!channelName || channelName.length === 0) {
    return null;
  } else {
    return keytar.getPassword('Oratio-Twitch', channelName);
  }
}

ipcMain.handle(
  'getTwitchToken',
  async (
    _event: IpcMainInvokeEvent,
    channelName: string
  ): Promise<string | null> => {
    return getTwitchToken(channelName);
  }
);

// TODO: how long does getPassword usually take? should we use this as async?
ipcMain.on(
  'getTwitchTokenSync',
  async (event: IpcMainEvent, channelName: string) => {
    event.returnValue = await getTwitchToken(channelName);
  }
);

export async function getAzureKey(): Promise<string | null> {
  return keytar.getPassword('Oratio-Azure', 'main');
}

ipcMain.handle('getAzureKey', async () => {
  return getAzureKey();
});

export async function setAzureKey(key: string) {
  keytar.setPassword('Oratio-Azure', 'main', key);
}

ipcMain.on('setAzureKey', async (_event, key: string) => {
  setAzureKey(key);
});

ipcMain.handle('getTTSCache', async () => {
  if (!cacheJSON) {
    await loadCacheFile();
    return cacheJSON;
  }

  return cacheJSON;
});

ipcMain.on('updateTTSCache', async (_event, json: string) => {
  console.log('updating cache main');
  cacheJSON = json;
});

let obsWindow: BrowserWindow | undefined;
ipcMain.on('openOBSWindow', () => {
  if (obsWindow === undefined) {
    obsWindow = new BrowserWindow({
      // backgroundColor: 'blue',
      height: 600,
      width: 800,
      title: 'Oratio OBS Display',
      autoHideMenuBar: true,
      // focusable: false,
      // transparent: true,
      webPreferences: {
        preload: app.isPackaged
          ? path.join(__dirname, 'preloadMain.js')
          : path.join(__dirname, '../.erb/dll/preloadMain.js'),
      },
    });

    if (process.env.NODE_ENV === 'development') {
      obsWindow.loadURL(
        `http://localhost:${
          process.env.PORT || '1212'
        }/dist/index_injected.html#/obs`
      );
    } else {
      obsWindow.loadURL(`file://${__dirname}/index_injected.html#/obs`);
    }

    // TODO remove
    // obsWindow.webContents.openDevTools();

    obsWindow.on('closed', () => {
      obsWindow = undefined;
    });
  }
});

ipcMain.on('sendSpeechOBSWindow', (_event, phrase: string) => {
  if (obsWindow) obsWindow.webContents.send('phraseFromMain', phrase);
});

ipcMain.on(
  'openFileExplorer',
  async (_event: IpcMainEvent, openPath: string) => {
    // make sure it's an absolute path
    openExplorer(path.resolve(openPath));
  }
);

const soundsDir =
  process.env.NODE_ENV === 'development'
    ? 'assets/sounds'
    : 'resources/assets/sounds';

ipcMain.handle('getDirListingSounds', async (): Promise<string[]> => {
  return fs.readdirSync(soundsDir);
});

ipcMain.on('downloadEmotes', downloadEmotes);

ipcMain.on('importEmoteMapFromDisk', async (event: IpcMainEvent) => {
  const emoteMap = await importEmoteLibFromDisk();
  if (emoteMap) updateEmoteMap(event.sender, emoteMap, false);
});

ipcMain.handle(
  'exportEmoteMap',
  async (
    _event: IpcMainInvokeEvent,
    emoteMap: { [key: string]: string }
  ): Promise<boolean> => {
    const success = await exportEmoteLib(emoteMap);
    return success;
  }
);

ipcMain.on('copyToClipboard', (_event: IpcMainEvent, value: string) => {
  clipboard.writeText(value);
});

ipcMain.handle('stopGlobalInputCapture', async () => {
  if (ioIsHooked) {
    toggleIOHook();
  }
});
