import React, { useEffect, useRef, useState } from 'react';

import {
  makeStyles,
  createStyles,
  MuiThemeProvider,
} from '@material-ui/core/styles';
import { Button, Grid, IconButton } from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import TextField from '@material-ui/core/TextField';
import red from '@material-ui/core/colors/red';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as Theme from './Theme';
import { Emote } from './Emote';
import { lsEmoteMap, lsTwitchAuth, lsTwitchChannel } from '../constants';
import { dialog } from 'electron';
import AlertDialog from './AlertDialog';

export const emoteNameToUrl: { [key: string]: string } = {};
export const lowercaseToEmoteName: { [key: string]: string } = {};
let asyncLoadingFinished = false;

// TODO this is relative to the current cwd -> make this relative to the Oratio executable if possible
const assetLoc =
  process.env.NODE_ENV === 'development'
    ? 'assets/emotes'
    : 'resources/assets/emotes';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function clearObject(obj: any) {
  for (const k of Object.keys(obj)) {
    delete obj[k];
  }
}

function mergeEmotes(other: { [key: string]: string }) {
  for (const [k, v] of Object.entries(other)) {
    emoteNameToUrl[k] = v;
  }

  for (const emoteName of Object.keys(emoteNameToUrl)) {
    lowercaseToEmoteName[emoteName.toLowerCase()] = emoteName;
  }
}

function loadEmoteLib() {
  clearObject(emoteNameToUrl);
  clearObject(lowercaseToEmoteName);

  const emotes: { [name: string]: string } = JSON.parse(
    localStorage.getItem(lsEmoteMap) ?? '{}'
  );
  mergeEmotes(emotes);
}

(async () => {
  loadEmoteLib();
  asyncLoadingFinished = true;
})();

// const charEscapes: { [char: string]: string } = {
//   ';': '__semicol__',
//   ':': '__colon__',
//   '\\': '__bslash__',
//   '/': '__fslash__',
//   '<': '__lt__',
//   '>': '__gt__',
//   '|': '__bar__',
//   '&': '__amper__',
//   '*': '__aster__',
// };

// function escapeEmoteFileName(name: string): string {
//   // let result = '';
//   // for (const char of name) {
//   //   if (char in charEscapes) {
//   //     result += charEscapes[char];
//   //   } else {
//   //     result += char;
//   //   }
//   // }
//   let result: string = name;
//   for (const [char, escape] of Object.entries(charEscapes)) {
//     result = result.replaceAll(char, escape);
//   }

//   return result;
// }

// function unescapeEmoteFileName(name: string): string {
//   let result: string = name;
//   for (const [char, escape] of Object.entries(charEscapes)) {
//     result = result.replaceAll(escape, char);
//   }

//   return result;
// }

const theme = Theme.default();
const useStyles = makeStyles(() =>
  createStyles({
    root: {
      flexGrow: 1,
      background: theme.palette.background.default,
      color: 'white',
      padding: theme.spacing(4),
    },
    content: {},
    text: {
      color: 'white',
      fontSize: '3rem',
      textAlign: 'center',
    },
    button: {
      padding: theme.spacing(2),
      textAlign: 'center',
      margin: '5px',
    },
    link: {
      textDecoration: 'none',
    },
    bottomButtons: {
      marginTop: '40px',
    },
  })
);

export default function Emotes() {
  const classes = useStyles();
  const { t } = useTranslation();

  // otherwise we might get an incomplete set of our emote lib
  if (!asyncLoadingFinished) {
    loadEmoteLib();
  }

  function openEmoteDirectory() {
    window.electronAPI.openFileExplorer(assetLoc);
  }

  const [, updateState] = React.useState<Record<string, never>>();
  const forceUpdate = React.useCallback(() => updateState({}), []);

  // NOTE: apparently it's not a good idea to use destructuring for process.env
  // -> use process.env.TWITCH_CLIENT_ID directly instead
  // eslint-disable-next-line prefer-destructuring
  const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
  // users can only change this by going back to maing settings so only
  // refreshing it here is fine;
  const hasAuth = localStorage.getItem(lsTwitchAuth) === '1';
  const channelName = localStorage.getItem(lsTwitchChannel);
  const canGetEmotes =
    TWITCH_CLIENT_ID && hasAuth && channelName && channelName.length > 3;

  const [channelEmotes, setChannelEmotes] = React.useState<{
    value: string;
    valid: boolean;
  }>({ value: '', valid: false });

  const [importState, setImportState] = React.useState<string>('');
  const [importStateGlobal, setImportStateGlobal] = React.useState<string>('');
  const [importStateChannel, setImportStateChannel] =
    React.useState<string>('');
  const setState: React.MutableRefObject<(state: string) => void | null> =
    React.useRef(setImportState);
  async function downloadAvailableEmotes(
    channel: string | null,
    global: boolean
  ) {
    // channel === null -> we get all available emotes for the current user
    // otherwise we only get the twitch emotes of that channel
    if (channel !== null && global) {
      throw new Error('channel and global parameters are mutually exclusive!');
    }

    // select correct state setting function
    if (!global) {
      setState.current =
        channel === null ? setImportState : setImportStateChannel;
    } else {
      setState.current = setImportStateGlobal;
    }

    if (!canGetEmotes) {
      setState.current("Missing authorization! Can't start emote download!");
      return;
    }

    setState.current('Import started');
    window.electronAPI.startEmoteDownload(channelName, channel, global);
  }

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('Confirm?');
  const confirmedCallback = useRef<(() => void) | null>(null);
  const handleDialogClose = () => setDialogOpen(false);
  const handleDialogChoice = (choice: 1 | 2) => {
    if (choice == 2) {
      if (confirmedCallback.current !== null) confirmedCallback.current();
    }
    handleDialogClose();
  };

  const onEmoteRemoved = async (name: string) => {
    // NOTE: can't use confirm/alert dialogs in electron since it messes up the
    // window focus on windows
    // (see https://github.com/electron/electron/issues/19977)
    setDialogMessage(`Delete emote ${name}?`);
    confirmedCallback.current = () => {
      delete emoteNameToUrl[name];
      delete lowercaseToEmoteName[name.toLowerCase()];
      localStorage.setItem(lsEmoteMap, JSON.stringify(emoteNameToUrl));
      window.electronAPI.exportEmoteMap(emoteNameToUrl);
      // not efficient since all emotes get re-rendered TODO
      forceUpdate();
    };
    setDialogOpen(true);
  };

  useEffect(() => {
    // do this here, so we don't have multiple event listeners
    window.electronAPI.onEmoteDownloadProgress(
      (_event, _type: string, message: string) => {
        setState.current(message);
      }
    );

    // here the entire map gets replaced
    window.electronAPI.onUpdateEmoteMap(
      async (
        _event,
        emoteMap: { [key: string]: string },
        writeToDisk: boolean
      ) => {
        localStorage.setItem(lsEmoteMap, JSON.stringify(emoteMap));
        loadEmoteLib();

        if (writeToDisk === false) {
          forceUpdate();
          return;
        }

        if (await window.electronAPI.exportEmoteMap(emoteNameToUrl)) {
          setState.current('Exported emote lib!');
        } else {
          setState.current('Failed to export emote lib!');
        }
      }
    );

    // here emotes get added and existing ones get replaced
    window.electronAPI.onMergeEmoteMap(
      async (_event, emoteMap: { [key: string]: string }) => {
        mergeEmotes(emoteMap);
        localStorage.setItem(lsEmoteMap, JSON.stringify(emoteNameToUrl));
        if (await window.electronAPI.exportEmoteMap(emoteNameToUrl)) {
          setState.current('Exported emote lib!');
        } else {
          setState.current('Failed to export emote lib!');
        }
      }
    );
  }, []);

  const element = (
    <MuiThemeProvider theme={theme}>
      <AlertDialog
        open={dialogOpen}
        title={'Confirm deletion?'}
        message={dialogMessage}
        opt1={'No'}
        opt2={'Yes'}
        onChoice={handleDialogChoice}
        onClose={handleDialogClose}
      />
      <div className={classes.root}>
        <div className={classes.content}>
          <h2>Emote Tools</h2>

          <Button
            id="open-emote-directory"
            variant="contained"
            className={classes.button}
            color="primary"
            onClick={openEmoteDirectory}
          >
            {t('Open Emote Directory')}
          </Button>
          <Button
            id="reload-emotes"
            variant="contained"
            className={classes.button}
            color="primary"
            onClick={async () => {
              window.electronAPI.importEmoteMapFromDisk();
            }}
          >
            {t('Reload emotes')}
          </Button>
          <Button
            id="clear-emotes"
            variant="contained"
            className={classes.button}
            style={{ backgroundColor: red[300] }}
            onClick={async () => {
              setDialogMessage(`Clear all emotes (not recoverable!)?`);
              confirmedCallback.current = () => {
                clearObject(emoteNameToUrl);
                clearObject(lowercaseToEmoteName);
                localStorage.setItem(
                  lsEmoteMap,
                  JSON.stringify(emoteNameToUrl)
                );
                window.electronAPI.exportEmoteMap(emoteNameToUrl);
                forceUpdate();
              };
              setDialogOpen(true);
            }}
          >
            {t('Clear emotes')}
          </Button>

          <p>{t('Reload emotes explanation')}</p>
          <p>{t('Clear emotes explanation')}</p>

          <h2>{t('Importing emotes')}</h2>
          <p>{t('Import emotes explanation')}</p>

          <Grid container direction="row" spacing={3}>
            <Grid
              container
              item
              xs={12}
              justifyContent="flex-start"
              alignItems="center"
            >
              <Button
                id="get-emotes"
                variant="contained"
                // className={classes.button}
                color="primary"
                disabled={!canGetEmotes}
                onClick={() => {
                  downloadAvailableEmotes(null, true);
                }}
              >
                {canGetEmotes
                  ? t('Refresh global emotes!')
                  : t('Not authorized!')}
              </Button>
              <span style={{ paddingLeft: '1em' }}>{importStateGlobal}</span>
            </Grid>
          </Grid>

          <Grid container direction="row" spacing={3}>
            <Grid
              container
              item
              xs={12}
              justifyContent="flex-start"
              alignItems="center"
            >
              <Button
                id="get-emotes"
                variant="contained"
                // className={classes.button}
                color="primary"
                disabled={!canGetEmotes}
                onClick={() => {
                  downloadAvailableEmotes(null, false);
                }}
              >
                {canGetEmotes
                  ? t('Refresh your channel emotes!')
                  : t('Not authorized!')}
              </Button>
              <span style={{ paddingLeft: '1em' }}>{importState}</span>
            </Grid>
          </Grid>

          <p>{t('Twitch channel explanation')}</p>

          <Grid container direction="row" spacing={1}>
            <Grid
              container
              item
              // grid has 12 cols -> we can use to fill an entire row
              // so we don't have to create a new one
              // or use an empty col with a width of 6cols
              xs={6}
              justifyContent="flex-start"
              alignItems="center"
            >
              <TextField
                id="channel-name"
                fullWidth
                label={t('Twitch channel name')}
                helperText={`${
                  channelEmotes.valid ? t('Valid') : t('Missing or invalid')
                }`}
                value={channelEmotes.value}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const trimmed = e.target.value.trim();
                  // twitch channel names are at least 4 chars
                  setChannelEmotes({
                    value: trimmed,
                    valid: trimmed.length > 3,
                  });
                }}
              />
            </Grid>
            <Grid
              item
              // or use an empty col with a width of 6cols
              xs={6}
            />
            <Grid
              container
              item
              // grid has 12 cols -> we can use to fill an entire row
              // so we don't have to create a new one
              xs={12}
              justifyContent="flex-start"
              alignItems="center"
            >
              <Button
                id="get-emotes-channel"
                variant="contained"
                // className={classes.button}
                color="primary"
                disabled={!canGetEmotes || !channelEmotes.valid}
                onClick={() => {
                  downloadAvailableEmotes(channelEmotes.value, false);
                }}
              >
                {canGetEmotes ? t('Add Emotes!') : t('Not authorized!')}
              </Button>
              <span style={{ paddingLeft: '1em' }}>{importStateChannel}</span>
            </Grid>
          </Grid>

          <h2>{t('Emote Previews')}</h2>
          <table>
            <tbody>
              {Object.keys(emoteNameToUrl)
                .sort()
                .map((name: string) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>
                      <Emote emoteName={name} emoteNameToUrl={emoteNameToUrl} />
                      <IconButton
                        aria-label="delete"
                        onClick={() => onEmoteRemoved(name)}
                      >
                        <DeleteIcon
                          aria-label="delete"
                          style={{ color: red[500] }}
                        />
                      </IconButton>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <Grid
            container
            direction="row"
            spacing={3}
            className={classes.bottomButtons}
          >
            <Grid item xs={4}>
              <Link to="/preferences" className={classes.link}>
                <Button
                  id="open-preferences"
                  variant="contained"
                  className={classes.button}
                  color="primary"
                >
                  {t('Back')}
                </Button>
              </Link>
            </Grid>
          </Grid>
        </div>
      </div>
    </MuiThemeProvider>
  );
  return element;
}
