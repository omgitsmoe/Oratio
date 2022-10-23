import { useEffect, useState, useRef, useReducer } from 'react';

import { makeStyles, createStyles } from '@material-ui/core/styles';
import { Button, Grid, IconButton, MenuItem, Select } from '@material-ui/core';
import { red } from '@material-ui/core/colors';
import DeleteIcon from '@material-ui/icons/Delete';
import { useTranslation } from 'react-i18next';
import hotkeys from 'hotkeys-js';
import * as Theme from '../Theme';
import { VoiceConfigMap, storageConfigsName } from '../VoiceConfigBar';
import { lsKeybindings } from '../../constants';

const theme = Theme.default();
const useStyles = makeStyles(() =>
  createStyles({
    root: {
      margin: theme.spacing(1),
      minWidth: '100%',
    },
    button: {
      padding: theme.spacing(2),
      textAlign: 'center',
    },
    fullWidth: {
      minWidth: '100%',
    },
    bindings: {
      margin: theme.spacing(0),
      padding: theme.spacing(0),
    },
    styleSelect: {
      minWidth: '80%',
    },
  })
);

export default function KeybindConfig() {
  const { t } = useTranslation();
  const classes = useStyles();

  function reducer(
    state: { [keys: string]: string },
    action: { type: string; keys: string; action: string }
  ): { [keys: string]: string } {
    const result: { [keys: string]: string } = { ...state };
    switch (action.type) {
      case 'add':
        result[action.keys] = action.action;
        break;
      case 'remove':
        delete result[action.keys];
        break;
      default:
        console.error('Unknwon action');
    }

    localStorage.setItem(lsKeybindings, JSON.stringify(result));

    return result;
  }

  const [pressedKeys, setPressedKeys] = useState<string[]>([]);
  const [keyBindings, changeBindings] = useReducer(
    reducer,
    JSON.parse(localStorage.getItem(lsKeybindings) || '{}')
  );
  const [watching, setWatching] = useState<boolean>(false);
  const stopWatching = useRef(() => {});
  const startWatching = useRef(() => {});

  const [configNames, setConfigNames] = useState<string[]>([]);

  useEffect(() => {
    // create look-up table for keycode to keyname
    const keyCodeToKeyName: { [key: number]: string } = {};
    for (const [keyName, keyCode] of Object.entries(hotkeys.keyMap)) {
      keyCodeToKeyName[keyCode] = keyName;
    }
    for (const [keyName, keyCode] of Object.entries(hotkeys.modifier)) {
      keyCodeToKeyName[keyCode] = keyName;
    }
    let allPressedKeys: string[] = [];

    function watchKeys(ev: KeyboardEvent) {
      const newPressed = hotkeys
        .getPressedKeyCodes()
        .map((value: number) => {
          // special keys/modifiers are in keyCodeToKeyName for other keycodes
          // we can use the code point (utf-16)
          return keyCodeToKeyName[value] || String.fromCharCode(value);
        })
        .filter((value: string) => !allPressedKeys.includes(value));

      allPressedKeys = allPressedKeys.concat(newPressed);
      setPressedKeys(allPressedKeys);

      ev.preventDefault();
      return false;
    }

    startWatching.current = () => {
      window.addEventListener('keydown', watchKeys, true);
      setWatching(true);
    };
    stopWatching.current = () => {
      window.removeEventListener('keydown', watchKeys, true);
      setWatching(false);
      allPressedKeys = [];
    };

    // NOTE: IMPORANT! we need to call hotkeys at least once - even without any key binding
    // in order for getPresssedKeyCodes to work
    hotkeys('f10', () => {});

    // load config names
    const configs = localStorage.getItem(storageConfigsName);
    if (configs) {
      const configMap: VoiceConfigMap = JSON.parse(configs);
      setConfigNames(Object.keys(configMap));
    }

    // NOTE: make sure to remove the keydown event listener when dismounting
    return () => {
      if (stopWatching.current) stopWatching.current();
    };
  }, []);

  return (
    <>
      <h2>Keybindings</h2>
      <Grid container direction="row" spacing={3}>
        <Grid item xs={4}>
          <Button
            id="toggle-watching"
            variant="contained"
            color="primary"
            className={`${classes.button} ${classes.fullWidth}`}
            onClick={() => {
              if (watching) {
                stopWatching.current();
                setWatching(false);
                // TODO disallow binding Ctrl+O (which is the global binding to bring up Oratio)?
                changeBindings({
                  type: 'add',
                  keys: pressedKeys.join('+'),
                  action: '',
                });
                setPressedKeys([]);
              } else {
                startWatching.current();
                setWatching(true);
              }
            }}
          >
            {watching ? t('Save binding') : t('Add binding')}
          </Button>
        </Grid>
        {watching && (
          <Grid item xs={6} container alignItems="center">
            Pressed: {pressedKeys.join('+')}
          </Grid>
        )}
      </Grid>
      <Grid
        container
        direction="row"
        wrap="nowrap"
        style={{ marginTop: '1rem' }}
      >
        <Grid container alignItems="center" item xs={5}>
          {t('Keys')}
        </Grid>
        <Grid container alignItems="center" item xs={4}>
          {t('Configuration')}
        </Grid>
        <Grid container alignItems="center" item xs={3}>
          {t('Actions')}
        </Grid>
      </Grid>
      {Object.entries(keyBindings).map(([keys, action]) => (
        <Grid
          container
          direction="row"
          wrap="nowrap"
          key={keys}
          className={classes.bindings}
        >
          <Grid container alignItems="center" item xs={5}>
            {keys}
          </Grid>
          <Grid container alignItems="center" item xs={4}>
            <Select
              id="binding-style-select"
              value={action}
              className={classes.styleSelect}
              onChange={(e) => {
                changeBindings({
                  type: 'add',
                  keys,
                  action: e.target.value as string,
                });
              }}
            >
              {configNames.map((name: string) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item xs={3}>
            <IconButton
              aria-label="delete"
              style={{ color: red[500] }}
              onClick={() => {
                changeBindings({ type: 'remove', keys, action });
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Grid>
        </Grid>
      ))}
    </>
  );
}
