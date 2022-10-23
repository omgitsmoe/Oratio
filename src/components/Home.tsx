import React, { MutableRefObject, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import {
  MuiThemeProvider,
  makeStyles,
  createStyles,
} from '@material-ui/core/styles';
import SendIcon from '@material-ui/icons/Send';
import MicOffIcon from '@material-ui/icons/MicOff';
import SettingsIcon from '@material-ui/icons/Settings';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import { red, green } from '@material-ui/core/colors';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import * as Theme from './Theme';
import { lowercaseToEmoteName } from './Emotes';
import ChatStatus from './ChatStatus';
import ChatInteraction from '../TwitchChat';
import { TTSSettings, AzureTTS } from '../TTSAzure';
import { VoiceConfig } from './VoiceConfigBar';
import TTSConfig from './TTSConfig';
import TTSCache from '../TTSCache';
import * as constants from '../constants';
import PubnubChat, { PubnubChatMessageEvent } from '../Pubnub';

const theme = Theme.default();
const useStyles = makeStyles(() =>
  createStyles({
    root: {
      // flexGrow: 1,
      // height: '100vh',
      background: theme.palette.background.default,
      color: 'white',
      // disable scroll bar on home screen
      overflow: 'hidden',
    },
    content: {
      margin: theme.spacing(4),
    },
    button: {
      padding: theme.spacing(2),
      textAlign: 'center',
    },
    preferences: {
      marginRight: '10px',
    },
    link: {
      textDecoration: 'none',
    },
    icon: {
      fontSize: '8rem',
      // boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
    },
    header: {
      textAlign: 'center',
    },
    hello: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      margin: '20px 0',
    },
    buttonIcon: {
      marginLeft: '5px',
      marginRight: '5px',
    },
    formControl: {
      margin: theme.spacing(0),
      minWidth: '100%',
    },
  })
);

async function handleOpenObs() {
  window.electronAPI.openOBSWindow();
}

const channelName = localStorage.getItem(constants.lsTwitchChannel);
const oAuthToken = (() => {
  if (!channelName) {
    return null;
  }
  const token = window.electronAPI.getTwitchTokenSync(channelName);
  return token;
})();

const chat: ChatInteraction = new ChatInteraction(
  channelName,
  null,
  process.env.TWITCH_CLIENT_ID || null,
  {
    mirrorFromChat: localStorage.getItem(constants.lsMirrorFromChat) === '1',
    mirrorToChat: localStorage.getItem(constants.lsMirrorToChat) === '1',
  }
);

// TODO remove
const voiceVolume = 100;

export default function Home() {
  const classes = useStyles();
  const { t } = useTranslation();
  const socket = io(
    `http://localhost:${localStorage.getItem(constants.lsServerPort) || '4563'}`
  );

  useEffect(() => {
    return () => {
      socket.disconnect();
    };
  });

  const pubnub: MutableRefObject<PubnubChat | null> = useRef(null);

  const [ttsActive, setTTSActive] = React.useState(
    localStorage.getItem(constants.lsTTSActive) === '1'
  );
  const [textSoundMuted, setTextSoundMuted] = React.useState(
    localStorage.getItem(constants.lsTextSoundMuted) === '1'
  );

  // these can't change between renders
  const [ttsHasAuth, setTtsHasAuth] = React.useState(false);
  // creating AzureTTS in here would re-create it on __every__ render
  const tts = useRef<AzureTTS | null>(null);

  function handleTTSToggle(
    _event: React.ChangeEvent<HTMLInputElement>,
    value: boolean
  ) {
    if (value === true && tts.current) {
      // tts was deactivated before
      tts.current.open();
    } else if (value === false && tts.current) {
      tts.current.close();
    }

    setTTSActive(value);
    localStorage.setItem(constants.lsTTSActive, value ? '1' : '0');
  }

  const [voiceStyle, setVoiceStyle] = React.useState(
    localStorage.getItem(constants.lsVoiceStyle) || ''
  );
  const [voicePitch, setVoicePitch] = React.useState(
    parseFloat(localStorage.getItem(constants.lsVoicePitch) || '0')
  );
  const [voiceRate, setVoiceRate] = React.useState(
    parseFloat(localStorage.getItem(constants.lsVoiceRate) || '1')
  );

  // these can't change between renders
  const voiceLang = localStorage.getItem(constants.lsAzureVoiceLang) || '';
  const voiceName = localStorage.getItem(constants.lsAzureVoiceName) || '';

  function getCurrentSettings(): VoiceConfig {
    return {
      style: voiceStyle,
      volume: voiceVolume,
      pitch: voicePitch,
      rate: voiceRate,
    };
  }

  function handleConfigLoad(_name: string, value: VoiceConfig) {
    setVoiceStyle(value.style);
    localStorage.setItem(constants.lsVoiceStyle, value.style);
    setVoicePitch(value.pitch);
    localStorage.setItem(constants.lsVoicePitch, value.pitch.toString());
    setVoiceRate(value.rate);
    localStorage.setItem(constants.lsVoiceRate, value.rate.toString());
  }

  // wrap in a ref so a re-render doesn't delete our history
  const textHistory: React.MutableRefObject<string[]> = useRef([]);
  const textHistoryPos: React.MutableRefObject<number> = useRef(
    textHistory.current.length
  );

  const sendSpeech: React.MutableRefObject<
    ((phrase: string, from_chat: boolean) => void) | null
  > = useRef(null);
  // need to creat this function inside a useEffect with the correct dependency array,
  // otherwise the closure will use outdated values like voiceVolume etc.
  useEffect(() => {
    const addToHistory = (text: string) => {
      const curTextHistory = textHistory.current;
      if (curTextHistory[curTextHistory.length - 1] !== text) {
        curTextHistory.push(text);
        if (curTextHistory.length >= 100) {
          curTextHistory.shift();
        }
        textHistoryPos.current = curTextHistory.length;
      }
    };

    sendSpeech.current = async (phrase: string, from_chat: boolean) => {
      if (phrase.trim() === '') return;
      socket.emit('phraseSend', {
        phrase,
        settings: {
          speed: parseInt(
            localStorage.getItem(constants.lsTextSpeed) || '75',
            10
          ),
          fontSize: parseInt(
            localStorage.getItem(constants.lsFontSize) || '48',
            10
          ),
          fontColor: localStorage.getItem(constants.lsFontColor) || '#ffffff',
          fontWeight: parseInt(
            localStorage.getItem(constants.lsFontWeight) || '400',
            10
          ),
          soundFileName: localStorage.getItem(constants.lsSoundFileName),
          volume: textSoundMuted
            ? 0
            : parseFloat(localStorage.getItem(constants.lsVolumeName) || '50') /
              100,
          bubbleColor: localStorage.getItem(constants.lsBubbleColor) || '#000',
        },
      });
      // post the same message in twitch chat
      if (!from_chat && chat.mirrorToChat) {
        chat.sendToChat(phrase);
      }

      // send to OBS window, which will forward it to the OBS window if open
      window.electronAPI.sendPhraseOBSWindow(phrase);

      // publish on collab chat if set
      const collabChannel =
        localStorage.getItem(constants.lsCollabChannel) || 'test123';
      const collabBroadcast =
        localStorage.getItem(constants.lsCollabBroadcast) === '1' || true;
      if (pubnub.current && collabChannel && collabBroadcast)
        pubnub.current.post(phrase);

      // play TTS
      if (ttsActive && tts.current !== null) {
        tts.current.queuePhrase(phrase, {
          voiceLang,
          voiceName,
          voiceStyle,
          voiceVolume,
          voicePitch,
          voiceRate,
        });
      }

      addToHistory(phrase);
    };

    // update chat interaction handler, otherwise it will use an outdated version
    chat.setOnChatEvent(sendSpeech.current);
  }, [
    ttsActive,
    voiceStyle,
    voicePitch,
    voiceRate,
    textSoundMuted,
    socket,
    voiceLang,
    voiceName,
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSpeechSendClicked = async (event: any) => {
    event.preventDefault();
    const { speech } = event.currentTarget.elements;
    if (sendSpeech.current !== null)
      await sendSpeech.current(speech.value, false);
    speech.value = '';
  };

  useEffect(() => {
    // currently this component only really udpates after the user comes back
    // from the preferences page so it's fine to have this here for now
    chat.updateIdentity(channelName, oAuthToken);
    chat.mirrorFromChat =
      localStorage.getItem(constants.lsMirrorFromChat) === '1';
    chat.mirrorToChat = localStorage.getItem(constants.lsMirrorToChat) === '1';

    // send initial emoteMap
    socket.emit('updateEmoteMap', {
      emoteNameToUrl: JSON.parse(
        localStorage.getItem(constants.lsEmoteMap) || '{}'
      ),
    });

    const collabChannel = localStorage.getItem(constants.lsCollabChannel) || '';
    const collabListen = localStorage.getItem(constants.lsCollabListen) === '1';
    const collabBroadcast =
      localStorage.getItem(constants.lsCollabBroadcast) === '1';
    if (
      process.env.PN_PUB &&
      process.env.PN_SUB &&
      collabChannel &&
      (collabListen || collabBroadcast)
    ) {
      let userId = localStorage.getItem(constants.lsCollabUserId);
      if (!userId) {
        userId = PubnubChat.generateUserId();
        localStorage.setItem(constants.lsCollabUserId, userId);
      }

      async function collabMessage(event: PubnubChatMessageEvent) {
        console.log('passing on collab message');
        socket.emit('phraseSendCollab', {
          phrase: event.message,
          settings: {
            speed: parseInt(
              localStorage.getItem(constants.lsCollabTextSpeed) || '75',
              10
            ),
            fontSize: parseInt(
              localStorage.getItem(constants.lsCollabFontSize) || '48',
              10
            ),
            fontColor:
              localStorage.getItem(constants.lsCollabFontColor) || '#ffffff',
            fontWeight: parseInt(
              localStorage.getItem(constants.lsCollabFontWeight) || '400',
              10
            ),
            soundFileName: localStorage.getItem(
              constants.lsCollabSoundFileName
            ),
            volume: textSoundMuted
              ? 0
              : parseFloat(
                  localStorage.getItem(constants.lsCollabVolumeName) || '0'
                ) / 100,
            bubbleColor:
              localStorage.getItem(constants.lsCollabBubbleColor) || '#000',
          },
        });
      }
      pubnub.current = new PubnubChat(
        process.env.PN_PUB,
        process.env.PN_SUB,
        userId,
        collabChannel,
        collabListen,
        collabBroadcast,
        collabMessage
      );
    }

    async function initTTS() {
      // these can't change between renders
      const ttsSettings: TTSSettings = {
        apiKey: (await window.electronAPI.getAzureKey()) || '',
        region: localStorage.getItem(constants.lsAzureRegion) || '',
        skipEmotes: localStorage.getItem(constants.lsTTSSkipEmotes) === '1',
      };

      if (ttsSettings.apiKey && ttsSettings.region) {
        setTtsHasAuth(true);
        // TODO add capacity option in tts settings
        tts.current = new AzureTTS(ttsSettings);

        const cacheCap = parseInt(
          localStorage.getItem(constants.lsCacheLimit) || '500',
          10
        );
        if (tts.current && cacheCap > 0) {
          // request cache from main thread
          const cacheJSON = await window.electronAPI.getTTSCache();
          console.log('cache set');
          if (cacheJSON) {
            tts.current.cache = TTSCache.fromJSON(cacheJSON);
            if (tts.current.cache) {
              tts.current.cache.updateCapacity(cacheCap);
            }
          }
        }

        if (ttsActive) {
          tts.current.open();
        }
      } else {
        setTTSActive(false);
      }
    }

    initTTS();

    return () => {
      if (tts.current) {
        tts.current.close();
        if (tts.current.cache) {
          // send updated cache data to main thread
          window.electronAPI.updateTTSCache(tts.current.cache.toJSON());
        }
      }
    };
    // ttsActive not included in deps array since we have a sep function for handling that
  }, []);

  // Tab-complete
  let tabCompleteStart = 0;
  let tabCompletePrefixLow = '';
  let tabCompleteOptions: string[] = [];
  let tabCompleteOptionIndex = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleTextBoxKeypress(event: any) {
    // Autocomplete
    if (event.key === 'Tab') {
      event.preventDefault(); // do not go to the next element.\
      const textField = event.target;
      const text = textField.value;
      const { selectionStart } = textField;
      const words = [...text.matchAll(/\w+/g)].filter(
        (word) => word.index < selectionStart
      );
      if (!words.length) {
        // console.log('northing to autocomplete');
        return;
      }

      const word = words[words.length - 1];
      const prefixLow = word[0].toLowerCase();
      if (
        // Is this a different tab-complete than before?
        !(
          word.index === tabCompleteStart &&
          tabCompletePrefixLow.length &&
          prefixLow.startsWith(tabCompletePrefixLow)
        )
      ) {
        tabCompleteStart = word.index;
        tabCompletePrefixLow = prefixLow;
        tabCompleteOptions = Object.entries(lowercaseToEmoteName)
          .filter(([emoteLow]) => emoteLow.startsWith(prefixLow))
          .map(([, emoteName]) => `${emoteName} `);
        if (tabCompleteOptions.length === 0) {
          // no prefix match found. try substring matching.
          tabCompleteOptions = Object.entries(lowercaseToEmoteName)
            .filter(([emoteLow]) => emoteLow.indexOf(prefixLow) !== -1)
            .map(([, emoteName]) => `${emoteName} `);
        }
        tabCompleteOptions.sort();
        tabCompleteOptionIndex = 0;
      } else {
        const optionCount = tabCompleteOptions.length;
        tabCompleteOptionIndex =
          (tabCompleteOptionIndex + (event.shiftKey ? -1 : 1) + optionCount) %
          optionCount;
      }

      if (tabCompleteOptions.length === 0) {
        // console.log('no matching autocomplete options for: ', prefixLow);
        return;
      }

      const option = tabCompleteOptions[tabCompleteOptionIndex];
      tabCompletePrefixLow = option.toLowerCase().slice(0, option.length - 1);
      textField.value =
        text.slice(0, tabCompleteStart) + option + text.slice(selectionStart);
      textField.selectionStart = tabCompleteStart + option.length;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault(); // do not go to the next element.
      if (textHistoryPos.current > 0) {
        textHistoryPos.current -= 1;
      }
      event.target.value = textHistory.current[textHistoryPos.current] || '';
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault(); // do not go to the next element.

      if (textHistoryPos.current <= textHistory.current.length - 1) {
        textHistoryPos.current += 1;
      }
      event.target.value = textHistory.current[textHistoryPos.current] || '';
    }
  }

  return (
    <MuiThemeProvider theme={theme}>
      <div className={classes.root}>
        <div className={classes.content}>
          <form
            noValidate
            autoComplete="off"
            onSubmit={handleSpeechSendClicked}
          >
            <Grid container direction="row" spacing={3}>
              <Grid item xs={12}>
                <TextField
                  name="speech"
                  id="speech-input"
                  label={t('Speech')}
                  variant="outlined"
                  onKeyDown={handleTextBoxKeypress}
                  fullWidth
                  autoFocus
                />
              </Grid>
              <Grid container item xs={12} justify-content="flex-start">
                <Button
                  id="send-text"
                  variant="contained"
                  color="primary"
                  className={classes.button}
                  type="submit"
                  // disabled
                >
                  {t('Send')} <SendIcon className={classes.buttonIcon} />
                </Button>
                <FormControlLabel
                  control={
                    <Checkbox
                      style={
                        ttsActive ? { color: green[500] } : { color: red[500] }
                      }
                      checked={ttsActive}
                      disabled={!ttsHasAuth}
                      onChange={handleTTSToggle}
                    />
                  }
                  label={t('TTS active')}
                  labelPlacement="start"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      style={
                        textSoundMuted
                          ? { color: green[500] }
                          : { color: red[500] }
                      }
                      checked={textSoundMuted}
                      onChange={(event) => {
                        setTextSoundMuted(event.currentTarget.checked);
                        localStorage.setItem(
                          'textSoundMuted',
                          event.currentTarget.checked ? '1' : '0'
                        );
                      }}
                    />
                  }
                  label={t('Mute text sound')}
                  labelPlacement="start"
                />
              </Grid>
            </Grid>
            {ttsActive && (
              <TTSConfig
                getCurrentSettings={getCurrentSettings}
                handleConfigLoad={handleConfigLoad}
                voicePitch={voicePitch}
                voiceRate={voiceRate}
                voiceStyle={voiceStyle}
                onStyleChange={(value: string) => {
                  setVoiceStyle(value);
                  localStorage.setItem(constants.lsVoiceStyle, value);
                }}
                onPitchChange={(value: number) => {
                  setVoicePitch(value);
                  localStorage.setItem(
                    constants.lsVoicePitch,
                    value.toString()
                  );
                }}
                onRateChange={(value: number) => {
                  setVoiceRate(value);
                  localStorage.setItem(constants.lsVoiceRate, value.toString());
                }}
              />
            )}
          </form>
          {(chat.mirrorFromChat || chat.mirrorToChat) && (
            <ChatStatus
              chatInstance={chat}
              channelName={channelName}
              oAuthToken={oAuthToken}
            />
          )}
          <div>
            <div className={classes.hello}>
              <MicOffIcon className={classes.icon} />
            </div>
            <h1 className={classes.header}>Project Oratio</h1>
            <Grid container direction="row" spacing={3} alignItems="center">
              <Grid item xs={12}>
                Browser source running at:
                <a
                  href="http://localhost:4563"
                  target="_blank"
                  rel="noreferrer"
                  style={{ marginLeft: '5px' }}
                >
                  http://localhost:4563
                </a>
              </Grid>
            </Grid>
            <Grid container direction="row" spacing={3} alignItems="center">
              <Grid item xs={12}>
                <Link to="/preferences" className={classes.link}>
                  <Button
                    id="open-preferences"
                    variant="outlined"
                    color="secondary"
                    className={`${classes.button} ${classes.preferences}`}
                  >
                    <SettingsIcon className={classes.buttonIcon} />{' '}
                    {t('Preferences')}
                  </Button>
                </Link>

                <Button
                  id="open-obs"
                  variant="contained"
                  color="primary"
                  className={classes.button}
                  onClick={handleOpenObs}
                >
                  {t('Open OBS Display')}
                </Button>
              </Grid>
            </Grid>
          </div>
        </div>
      </div>
    </MuiThemeProvider>
  );
}
