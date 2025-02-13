/* eslint-disable prettier/prettier */
import React from 'react';
import { Button, Grid, Typography } from '@material-ui/core';
import TextField from '@material-ui/core/TextField';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormHelperText from '@material-ui/core/FormHelperText';
import Checkbox from '@material-ui/core/Checkbox';
import IconButton from '@material-ui/core/IconButton';
import CheckBoxOutlineBlankIcon from '@material-ui/icons/CheckBoxOutlineBlank';
import CheckBoxIcon from '@material-ui/icons/CheckBox';
import { red, green } from '@material-ui/core/colors';
import { useTranslation } from 'react-i18next';
import { lsMirrorFromChat, lsMirrorToChat, lsTwitchAuth, lsTwitchChannel } from '../../constants';

async function handleOpenTwitchAuth(channelName: string, notifyChange: (tokenMissing: boolean) => void) {
  // NOTE: apparently it's not a good idea to use destructuring for process.env
  // -> use process.env.TWITCH_CLIENT_ID directly instead
  // eslint-disable-next-line prefer-destructuring
  const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;

  // tell main process to start loopback server and open auth url in default browser
  window.electronAPI.startAuthLoopBack(channelName);
  if (!TWITCH_CLIENT_ID) {
    // main will warn with dialog box about missing client id and then stop
    return;
  }

  window.electronAPI.onReceiveTwitchToken(() => {
    localStorage.setItem(lsTwitchAuth, '1');
    // whether token is missing
    notifyChange(false);
  });
}

export default function ChatSettings() {
  const { t } = useTranslation();
  const [channelName, setChannelName] = React.useState(
    localStorage.getItem(lsTwitchChannel) || ''
  );
  // twitch username min chars is 4
  const missingChannel = channelName === null || channelName.trim().length < 4;

  const [missingAuth, setMissingAuth] = React.useState(
    localStorage.getItem(lsTwitchAuth) !== '1'
  );

  const [mirrorFromChat, setMirrorFromChat] = React.useState(
    localStorage.getItem(lsMirrorFromChat) === '1'
  );
  const [mirrorToChat, setMirrorToChat] = React.useState(
    localStorage.getItem(lsMirrorToChat) === '1'
  );

  const handleChangeMirrorFromChat = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = e.currentTarget.checked;
    localStorage.setItem(lsMirrorFromChat, newValue ? '1' : '0');
    setMirrorFromChat(newValue);
  };

  const handleChangeMirrorToChat = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.currentTarget.checked;
    localStorage.setItem(lsMirrorToChat, newValue ? '1' : '0');
    setMirrorToChat(newValue);
  };

  return (
    <Grid container direction="row" spacing={3}>
      <Grid item xs={6}>
        <TextField
          id="channel-name"
          fullWidth
          label={t('Twitch channel name')}
          value={channelName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const trimmed = e.target.value.trim();
            // twitch channel names are at least 4 chars
            if (trimmed.length < 4) {
              setMirrorToChat(false);
              localStorage.setItem(lsMirrorToChat, '0');
              setMirrorFromChat(false);
              localStorage.setItem(lsMirrorFromChat, '0');
            }
            // changing channel name should remove auth checkmark
            if (!missingAuth) {
              setMissingAuth(true);
              localStorage.setItem(lsTwitchAuth, '0');
            }

            setChannelName(e.target.value);
            // TODO mb use a delayed timer for setting it, so we don't set it on every keystroke
            // but prob not worth it
            localStorage.setItem(lsTwitchChannel, e.target.value);
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <Grid container direction="row" spacing={3}>
          <Grid
            container
            item
            xs={12}
            justifyContent="flex-start"
            alignItems="center"
          >
            { t('Authorized') }:
            <IconButton
              id="auth-status"
              style={ missingAuth ? { color: red[500] } : { color: green[500] } }
            >
              {missingAuth ? (
                <CheckBoxOutlineBlankIcon />
              ) : (
                <CheckBoxIcon />
              )}
            </IconButton>
          </Grid>
          <Grid
            container
            item
            xs={12}
            justifyContent="flex-start"
            alignItems="center"
            style={ { paddingTop: 0 } }
          >
            <Button
              id="open-browser-auth"
              variant="contained"
              // className={classes.button}
              disabled={channelName.length < 3}
              color="primary"
              // send event to main process to open the OAuth token generator in
              // the default browser
              onClick={() => {
                handleOpenTwitchAuth(channelName, setMissingAuth);
              }}
            >
              { t('Authorize') }!
            </Button>
          </Grid>
        </Grid>
      </Grid>
      <Grid item xs={8}>
        <FormGroup>
          <Typography variant='h5' style={{ marginBottom: '.5em' }}>
            { t('Chat mirroring') }:
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                id="mirror-from-chat"
                onChange={handleChangeMirrorFromChat}
                checked={mirrorFromChat}
                disabled={missingChannel}
              />
            }
            label={ t('from chat') }
          />
          {missingChannel && (
            <FormHelperText>{ t('Missing channel name') }</FormHelperText>
          )}
          <FormControlLabel
            control={
              <Checkbox
                id="mirror-to-chat"
                onChange={handleChangeMirrorToChat}
                checked={mirrorToChat}
                disabled={missingAuth || missingChannel}
              />
            }
            label={ t('to chat') }
          />
          {missingChannel && (
            <FormHelperText>{ t('Missing channel name') }</FormHelperText>
          )}
          {missingAuth && (
            <FormHelperText>{ t('Missing or invalid OAuth token') }</FormHelperText>
          )}
        </FormGroup>
      </Grid>
    </Grid>
  );
}
