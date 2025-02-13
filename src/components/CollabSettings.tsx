import React from 'react';
import {
  makeStyles,
  createStyles,
  MuiThemeProvider,
} from '@material-ui/core/styles';
import { Link } from 'react-router-dom';
import {
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Grid,
} from '@material-ui/core';
import SpeedIcon from '@material-ui/icons/Speed';
import FormatSizeIcon from '@material-ui/icons/FormatSize';
import TextField from '@material-ui/core/TextField';
import { useTranslation } from 'react-i18next';
import * as Theme from './Theme';
import SliderWithIcon from './settings/SliderWithIcon';
import BubbleBackgroundColorPicker from './settings/BubbleBackgroundColorSlider';
import FontBoldSlider from './settings/FontBoldSlider';
import FontColorPicker from './settings/FontColorPicker';
import VolumeSlider from './settings/VolumeSlider';
import AudioSelector from './settings/AudioSelector';
import {
  lsCollabBroadcast,
  lsCollabBubbleColor,
  lsCollabChannel,
  lsCollabFontColor,
  lsCollabFontSize,
  lsCollabFontWeight,
  lsCollabListen,
  lsCollabNick,
  lsCollabSoundFileName,
  lsCollabTextSpeed,
  lsCollabVolumeName,
} from '../constants';

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
    formControl: {
      // margin: theme.spacing(1),
      minWidth: '100%',
    },
  })
);

export default function TTSSettings() {
  const classes = useStyles();
  const { t } = useTranslation();

  const [channelName, setChannelName] = React.useState(
    localStorage.getItem(lsCollabChannel) || ''
  );
  const [channelNameError, setChannelNameError] = React.useState('');
  const [volume, setVolume] = React.useState(
    parseInt(localStorage.getItem(lsCollabVolumeName) || '0')
  );

  const [nickName, setNickName] = React.useState(
    localStorage.getItem(lsCollabNick) || ''
  );
  const [nickNameError, setNickNameError] = React.useState('');

  const [otherNickName, setOtherNickName] = React.useState('');
  const [otherNickNameError, setOtherNickNameError] = React.useState('');
  const [copyButtonText, setCopyButtonText] = React.useState(
    t<string>('Copy!')
  );

  function handleVolumeChange(
    _event: React.ChangeEvent<unknown>,
    newVolume: number | number[]
  ) {
    setVolume(newVolume as number);
    localStorage.setItem(lsCollabVolumeName, newVolume.toString());
  }

  const [textSpeed, setTextSpeed] = React.useState(
    parseInt(localStorage.getItem(lsCollabTextSpeed) || '75')
  );
  function handleTextSpeedChange(
    _event: React.ChangeEvent<unknown>,
    newValue: number | number[]
  ) {
    setTextSpeed(newValue as number);
    localStorage.setItem(lsCollabTextSpeed, newValue.toString());
  }

  const [fontSize, setFontSize] = React.useState(
    parseInt(localStorage.getItem(lsCollabFontSize) || '75')
  );
  function handleFontSizeChange(
    _event: React.ChangeEvent<unknown>,
    newValue: number | number[]
  ) {
    setFontSize(newValue as number);
    localStorage.setItem(lsCollabFontSize, newValue.toString());
  }

  const [listenCollab, setListenCollab] = React.useState(
    localStorage.getItem(lsCollabListen) === '1'
  );
  function setListenCollabAndPersist(checked: boolean) {
    const value = checked ? '1' : '0';
    localStorage.setItem(lsCollabListen, value);
    setListenCollab(checked);
  }

  const [broadcastCollab, setBroadcastCollab] = React.useState(
    localStorage.getItem(lsCollabBroadcast) === '1'
  );
  function setBroadcastCollabAndPersist(checked: boolean) {
    const value = checked ? '1' : '0';
    localStorage.setItem(lsCollabBroadcast, value);
    setBroadcastCollab(checked);
  }

  return (
    <MuiThemeProvider theme={theme}>
      <div className={classes.root}>
        <div className={classes.content}>
          <h2>{t('Collab Settings')}</h2>
          <p>{t('collab-channel-explanation')}</p>
          <p>
            {t('Browser source will be running at: ')}
            <b>{'http://localhost:4563/collab'}</b>
          </p>
          <Grid
            container
            direction="row"
            spacing={3}
            style={{ marginTop: '8px' }}
          >
            <Grid item xs={8}>
              <TextField
                className={classes.formControl}
                id="channel-name"
                fullWidth
                label={t('Collab Channel Name')}
                value={channelName}
                error={channelNameError !== ''}
                helperText={channelNameError}
                onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                  const trimmed = e.target.value.trim();
                  if (!trimmed.match(/^[-_=@.!$#%&^;A-Za-z0-9]{3,92}$/)) {
                    setChannelNameError(
                      'Channel names are alphanumeric with a minimum of 3 and a maximum of ' +
                        '92 characters including the following special charachters "-_=@.!$#%&^;"'
                    );
                    // can't listen AND broadcast without a valid channel
                    setBroadcastCollabAndPersist(false);
                    setListenCollabAndPersist(false);
                  } else {
                    setChannelNameError('');
                    localStorage.setItem(lsCollabChannel, trimmed);
                  }
                  setChannelName(trimmed);
                }}
              />
            </Grid>
            <Grid item xs={8}>
              <TextField
                className={classes.formControl}
                id="collab-nickname"
                fullWidth
                label={t('Nickname')}
                value={nickName}
                error={nickNameError !== ''}
                helperText={nickNameError}
                onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                  const trimmed = e.target.value.trim();
                  if (trimmed.length > 15) {
                    setNickNameError(
                      'Nick names may only be a maximum of 15 characters long!'
                    );
                    // can't broadcast without a valid nickname
                    setBroadcastCollabAndPersist(false);
                  } else if (trimmed.indexOf(':') !== -1) {
                    setNickNameError(
                      'Nick names are not allowed to contain colons!'
                    );
                    // can't broadcast without a valid nickname
                    setBroadcastCollabAndPersist(false);
                  } else {
                    setNickNameError('');
                    localStorage.setItem(lsCollabNick, trimmed);
                  }
                  setNickName(trimmed);
                }}
              />
            </Grid>
            <Grid item xs={8}>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      id="listen-collab"
                      checked={listenCollab}
                      disabled={
                        !channelName ||
                        !!channelNameError ||
                        !nickName ||
                        !!nickNameError
                      }
                      onChange={(
                        _event: React.ChangeEvent<HTMLInputElement>,
                        checked: boolean
                      ) => {
                        setListenCollabAndPersist(checked);
                      }}
                    />
                  }
                  label={t('Receive messages')}
                />
                {(!channelName || !!channelNameError) && (
                  <FormHelperText>{t('Missing channel name')}</FormHelperText>
                )}
                <FormControlLabel
                  control={
                    <Checkbox
                      id="broadcast-collab"
                      checked={broadcastCollab}
                      disabled={
                        !channelName ||
                        !!channelNameError ||
                        !nickName ||
                        !!nickNameError
                      }
                      onChange={(
                        _event: React.ChangeEvent<HTMLInputElement>,
                        checked: boolean
                      ) => {
                        setBroadcastCollabAndPersist(checked);
                      }}
                    />
                  }
                  label={t('Broadcast messages')}
                />
                {(!channelName || !!channelNameError) && (
                  <FormHelperText>{t('Missing channel name')}</FormHelperText>
                )}
              </FormGroup>
            </Grid>
          </Grid>
          <p>{t('collab-channel-per-user-explanation')}</p>
          <Grid
            container
            direction="row"
            spacing={3}
            style={{ marginBottom: '3px' }}
          >
            <Grid item xs={6}>
              <TextField
                className={classes.formControl}
                id="obs-nickname"
                fullWidth
                label={t('Collab Display Nick Name')}
                value={otherNickName}
                error={otherNickNameError !== ''}
                helperText={otherNickNameError}
                onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                  const trimmed = e.target.value.trim();
                  if (trimmed.length > 15) {
                    setOtherNickNameError(
                      'Nick names may only be a maximum of 15 characters long!'
                    );
                  } else if (trimmed.indexOf(':') !== -1) {
                    setOtherNickNameError(
                      'Nick names are not allowed to contain colons!'
                    );
                  } else {
                    setOtherNickNameError('');
                  }
                  setCopyButtonText(t('Copy!'));
                  setOtherNickName(trimmed);
                }}
              />
            </Grid>
            <Grid item xs={2}>
              <Button
                id="copy-collab-user-obs"
                variant="contained"
                className={classes.button}
                color="primary"
                disabled={!otherNickName || !!otherNickNameError}
                onClick={() => {
                  window.electronAPI.copyToClipboard(
                    `http://localhost:4563/collab?nick=${otherNickName}`
                  );
                  setCopyButtonText(t('Copied!'));
                }}
              >
                {copyButtonText}
              </Button>
            </Grid>
          </Grid>
          <h2>{t('Style')}</h2>
          <p>{t('collab-user-settings-explanation')}</p>
          <Grid
            container
            direction="row"
            spacing={3}
            style={{ marginBottom: '8px' }}
          >
            <Grid item xs={6}>
              <FontColorPicker localStorageName={lsCollabFontColor} />
            </Grid>
            <Grid item xs={6}>
              <BubbleBackgroundColorPicker
                localStorageName={lsCollabBubbleColor}
              />
            </Grid>
          </Grid>
          <p>{t('collab-general-settings-explanation')}</p>
          <Grid
            container
            direction="row"
            spacing={3}
            style={{ marginBottom: '8px' }}
          >
            <Grid item xs={6}>
              <AudioSelector
                localStorageName={lsCollabSoundFileName}
                noMargin={true}
              />
            </Grid>
          </Grid>
          <Grid container direction="row" spacing={3}>
            <Grid item xs={6}>
              <VolumeSlider
                label={t('Volume')}
                value={volume}
                onChange={handleVolumeChange}
                valueDisplay="on"
              />
            </Grid>
            <Grid item xs={6}>
              <SliderWithIcon
                value={textSpeed}
                label={t('Text Speed')}
                displayValue="on"
                onChange={handleTextSpeedChange}
                icon={<SpeedIcon />}
              />
            </Grid>
            <Grid item xs={6}>
              <SliderWithIcon
                value={fontSize}
                label={t('Text Size')}
                displayValue="on"
                max={200}
                onChange={handleFontSizeChange}
                icon={<FormatSizeIcon />}
              />
            </Grid>
            <Grid item xs={6}>
              <FontBoldSlider localStorageName={lsCollabFontWeight} />
            </Grid>
          </Grid>
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
}
