import { IpcMainEvent } from 'electron';
import * as https from 'https';
import * as fs from 'fs';
import TwitchApi, { Emote as EmoteCommon } from './TwitchApi';
import { getTwitchToken, setTwitchAuth } from './main.dev';

const assetLoc =
  process.env.NODE_ENV === 'development'
    ? 'assets/emotes'
    : 'resources/assets/emotes';
export const emoteLibPath = `${assetLoc}/emotes.json`;

export function updateEmoteMap(
  wc: Electron.WebContents,
  emoteNameToUrl: { [key: string]: string },
  writeToDisk: boolean
) {
  wc.send('updateEmoteMap', emoteNameToUrl, writeToDisk);
}

export async function importEmoteLibFromDisk(): Promise<
  { [key: string]: string } | undefined
> {
  const emoteNameToUrl: { [key: string]: string } = {};
  // const lowercaseToEmoteName: { [key: string]: string } = {};

  fs.mkdirSync(assetLoc, { recursive: true });
  let data: { [name: string]: string };
  try {
    data = JSON.parse(fs.readFileSync(emoteLibPath, 'utf-8'));
  } catch (e) {
    return;
  }

  for (const [name, filePath] of Object.entries(data)) {
    emoteNameToUrl[name] = encodeURI(filePath);
    // lowercaseToEmoteName[name.toLowerCase()] = name;
  }

  return emoteNameToUrl;
}

export async function exportEmoteLib(emoteNameToUrl: {
  [key: string]: string;
}): Promise<boolean> {
  fs.mkdirSync(assetLoc, { recursive: true });
  try {
    fs.writeFileSync(emoteLibPath, JSON.stringify(emoteNameToUrl));
  } catch (e) {
    return false;
  }

  return true;
}

function mergeEmoteMap(
  wc: Electron.WebContents,
  emoteNameToUrl: { [key: string]: string }
) {
  wc.send('mergeEmoteMap', emoteNameToUrl);
}

/**
 * Downloads file from remote HTTPS host and puts its contents to the
 * specified location but adds the appropriate file extension from the MIME type.
 */
async function startDownload(
  emote: EmoteCommon,
  groupDir: string,
  agent: https.Agent
): Promise<[EmoteCommon, string]> {
  return new Promise((resolve, reject) => {
    // ids might clash, but not inside groupdirs
    const filePath = `${groupDir}/${emote.id}`;
    const file = fs.createWriteStream(filePath);
    let fileInfo: { mime?: string; size?: number } = {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const request = https.get(emote.url, { agent }, (response: any) => {
      if (response.statusCode !== 200) {
        reject(
          new Error(`Failed to get '${emote.url}' (${response.statusCode})`)
        );
        return;
      }

      fileInfo = {
        mime: response.headers['content-type'],
        size: parseInt(response.headers['content-length'], 10),
      };

      response.pipe(file);
    });

    // The destination stream is ended by the time it's called
    file.on('finish', () => {
      const extension = (fileInfo.mime || '/png').split('/')[1];
      const filePathWithExtension = `${filePath}.${extension}`;
      try {
        fs.renameSync(filePath, filePathWithExtension);
        resolve([emote, filePathWithExtension]);
      } catch (e) {
        reject(new Error(`Failed to rename file: ${e}`));
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request.on('error', (err: any) => {
      fs.unlink(filePath, () => reject(err));
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    file.on('error', (err: any) => {
      fs.unlink(filePath, () => reject(err));
    });

    request.end();
  });
}

async function fetchEmotes(
  groupName: string,
  emotes: EmoteCommon[],
  agent: https.Agent
): Promise<Promise<[EmoteCommon, string]>[]> {
  const promises = [];
  const groupDir = `${assetLoc}/${groupName}`;
  fs.mkdirSync(groupDir, { recursive: true });
  for (const emote of emotes) {
    if (emote.url) {
      promises.push(startDownload(emote, groupDir, agent));
    } else {
      // eslint-disable-next-line no-console
      console.warn('emote missing url: ', emote.name);
    }
  }
  return promises;
}

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
function reportEmoteProgress(
  wc: Electron.WebContents,
  type: string,
  message: string
) {
  wc.send('emoteDownloadProgress', type, message);
}

export async function downloadEmotes(
  event: IpcMainEvent,
  authorizedChannel: string,
  channel: string | null,
  global: boolean
) {
  try {
    const authToken = await getTwitchToken(authorizedChannel);
    if (authToken === null) {
      reportEmoteProgress(
        event.sender,
        'error',
        'Could not get authorization! Re-authorization needed!'
      );
      return;
    }

    const tw = new TwitchApi(
      // button can't be pressed if either of these are null
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      TWITCH_CLIENT_ID!,
      authToken,
      // callback for when we get a 401: Unauthorized response
      () => {
        setTwitchAuth(event.sender, false);
      }
    );

    // also checked by canGetEmotes
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const userId = global
      ? null
      : await tw.getUserId(channel ?? authorizedChannel);
    if (userId === null && !global) {
      reportEmoteProgress(
        event.sender,
        'error',
        'Could not retrieve user id from twitch servers!'
      );
      return;
    }

    const allEmotes: [groupName: string, emotes: EmoteCommon[]][] = [];
    // get all emotes of current user
    if (channel === null) {
      // get EmoteGroups object and convert it to [groupName, emotes] using
      // Object.entries
      if (global === true) {
        allEmotes.push(...Object.entries(await tw.getGlobalEmotes()));
      } else {
        // will not be null see the if right after userId
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        allEmotes.push(...Object.entries(await tw.getChannelEmotes(userId!)));
      }
    } else {
      allEmotes.push(
        // will not be null see the if right after userId
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        ...Object.entries(await tw.getTwitchChannelEmotesConverted(userId!))
      );
    }

    const agent = new https.Agent({ maxSockets: 25 });
    const promises: Promise<[EmoteCommon, string]>[] = [];
    for (const [groupName, emotes] of allEmotes) {
      let newGroupName = groupName;
      if (groupName.endsWith('Channel')) {
        // Channel 7 chars
        const channelStartIndex = groupName.length - 7;
        newGroupName = `${channel}_${groupName.slice(0, channelStartIndex)}`;
      }
      // eslint-disable-next-line no-await-in-loop
      promises.push(...(await fetchEmotes(newGroupName, emotes, agent)));
    }
    if (promises.length === 0) {
      reportEmoteProgress(
        event.sender,
        'error',
        'Error: Emote APIs returned no emotes!'
      );
      return;
    }

    let numFinished = 0;
    const progressUpdate = (message: string) => {
      reportEmoteProgress(
        event.sender,
        'progress',
        `[${numFinished}/${promises.length}] ${message}`
      );
    };
    progressUpdate('Started downloads...');
    const emoteNameToUrl: { [key: string]: string } = {};
    // const lowercaseToEmoteName: { [key: string]: string } = {};

    await Promise.all(
      promises.map((p) =>
        p.then((data) => {
          const [emote, filePathWithExtension] = data;
          numFinished += 1;
          progressUpdate(emote.name);

          // add to emote map
          // html paths are relative to resources/app.asar that's why we
          // need '../'
          // node/electron paths though are relative to the exe which is
          // where 'resources' lives as well
          // so filePathWithExtension currently is the electron path and
          // now we need to remove 'resources' from the url (not in a dev env though)
          // and add '../'
          emoteNameToUrl[emote.name] = `../${encodeURI(
            filePathWithExtension.replace(/^resources\//, '')
          )}`;
          // lowercaseToEmoteName[emote.name.toLowerCase()] = emote.name;
          return null;
        })
      )
    );

    mergeEmoteMap(event.sender, emoteNameToUrl);
  } catch (err) {
    reportEmoteProgress(event.sender, 'error', `Error: ${err}`);
  }
}
