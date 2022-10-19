import { ipcRenderer } from 'electron';
import React, { useEffect } from 'react';
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
  FormHelperText,
  Grid,
} from '@material-ui/core';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import TextField from '@material-ui/core/TextField';
import { green, red } from '@material-ui/core/colors';
import { useTranslation } from 'react-i18next';
import {
  SpeechConfig,
  SpeechSynthesizer,
  VoiceInfo,
  SynthesisVoicesResult,
} from 'microsoft-cognitiveservices-speech-sdk';
import * as Theme from './Theme';
import KeybindConfig from './settings/KeybindConfig';

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
      margin: theme.spacing(1),
      minWidth: '100%',
    },
  })
);

const bcp47ToLanuageName: { [key: string]: string } = {
  'af-ZA': 'Afrikaans (South Africa)',
  'am-ET': 'Amharic (Ethiopia)',
  'ar-DZ': 'Arabic (Algeria)',
  'ar-BH': 'Arabic (Bahrain)',
  'ar-EG': 'Arabic (Egypt)',
  'ar-IQ': 'Arabic (Iraq)',
  'ar-JO': 'Arabic (Jordan)',
  'ar-KW': 'Arabic (Kuwait)',
  'ar-LY': 'Arabic (Libya)',
  'ar-MA': 'Arabic (Morocco)',
  'ar-QA': 'Arabic (Qatar)',
  'ar-SA': 'Arabic (Saudi Arabia)',
  'ar-SY': 'Arabic (Syria)',
  'ar-TN': 'Arabic (Tunisia)',
  'ar-AE': 'Arabic (United Arab Emirates)',
  'ar-YE': 'Arabic (Yemen)',
  'bn-BD': 'Bangla (Bangladesh)',
  'bn-IN': 'Bengali (India)',
  'bg-BG': 'Bulgarian (Bulgaria)',
  'my-MM': 'Burmese (Myanmar)',
  'ca-ES': 'Catalan (Spain)',
  'zh-HK': 'Chinese (Cantonese, Traditional)',
  'zh-CN': 'Chinese (Mandarin, Simplified)',
  'zh-TW': 'Chinese (Taiwanese Mandarin)',
  'hr-HR': 'Croatian (Croatia)',
  'cs-CZ': 'Czech (Czech)',
  'da-DK': 'Danish (Denmark)',
  'nl-BE': 'Dutch (Belgium)',
  'nl-NL': 'Dutch (Netherlands)',
  'en-AU': 'English (Australia)',
  'en-CA': 'English (Canada)',
  'en-HK': 'English (Hongkong)',
  'en-IN': 'English (India)',
  'en-IE': 'English (Ireland)',
  'en-KE': 'English (Kenya)',
  'en-NZ': 'English (New Zealand)',
  'en-NG': 'English (Nigeria)',
  'en-PH': 'English (Philippines)',
  'en-SG': 'English (Singapore)',
  'en-ZA': 'English (South Africa)',
  'en-TZ': 'English (Tanzania)',
  'en-GB': 'English (United Kingdom)',
  'en-US': 'English (United States)',
  'et-EE': 'Estonian (Estonia)',
  'fil-PH': 'Filipino (Philippines)',
  'fi-FI': 'Finnish (Finland)',
  'fr-BE': 'French (Belgium)',
  'fr-CA': 'French (Canada)',
  'fr-FR': 'French (France)',
  'fr-CH': 'French (Switzerland)',
  'gl-ES': 'Galician (Spain)',
  'de-AT': 'German (Austria)',
  'de-DE': 'German (Germany)',
  'de-CH': 'German (Switzerland)',
  'el-GR': 'Greek (Greece)',
  'gu-IN': 'Gujarati (India)',
  'he-IL': 'Hebrew (Israel)',
  'hi-IN': 'Hindi (India)',
  'hu-HU': 'Hungarian (Hungary)',
  'is-IS': 'Icelandic (Iceland)',
  'id-ID': 'Indonesian (Indonesia)',
  'ga-IE': 'Irish (Ireland)',
  'it-IT': 'Italian (Italy)',
  'ja-JP': 'Japanese (Japan)',
  'jv-ID': 'Javanese (Indonesia)',
  'kn-IN': 'Kannada (India)',
  'kk-KZ': 'Kazakh (Kazakhstan)',
  'km-KH': 'Khmer (Cambodia)',
  'ko-KR': 'Korean (Korea)',
  'lo-LA': 'Lao (Laos)',
  'lv-LV': 'Latvian (Latvia)',
  'lt-LT': 'Lithuanian (Lithuania)',
  'mk-MK': 'Macedonian (Republic of North Macedonia)',
  'ms-MY': 'Malay (Malaysia)',
  'ml-IN': 'Malayalam (India)',
  'mt-MT': 'Maltese (Malta)',
  'mr-IN': 'Marathi (India)',
  'nb-NO': 'Norwegian (Bokmål, Norway)',
  'ps-AF': 'Pashto (Afghanistan)',
  'fa-IR': 'Persian (Iran)',
  'pl-PL': 'Polish (Poland)',
  'pt-BR': 'Portuguese (Brazil)',
  'pt-PT': 'Portuguese (Portugal)',
  'ro-RO': 'Romanian (Romania)',
  'ru-RU': 'Russian (Russia)',
  'sr-RS': 'Serbian (Serbia, Cyrillic)',
  'si-LK': 'Sinhala (Sri Lanka)',
  'sk-SK': 'Slovak (Slovakia)',
  'sl-SI': 'Slovenian (Slovenia)',
  'so-SO': 'Somali (Somalia)',
  'es-AR': 'Spanish (Argentina)',
  'es-BO': 'Spanish (Bolivia)',
  'es-CL': 'Spanish (Chile)',
  'es-CO': 'Spanish (Colombia)',
  'es-CR': 'Spanish (Costa Rica)',
  'es-CU': 'Spanish (Cuba)',
  'es-DO': 'Spanish (Dominican Republic)',
  'es-EC': 'Spanish (Ecuador)',
  'es-SV': 'Spanish (El Salvador)',
  'es-GQ': 'Spanish (Equatorial Guinea)',
  'es-GT': 'Spanish (Guatemala)',
  'es-HN': 'Spanish (Honduras)',
  'es-MX': 'Spanish (Mexico)',
  'es-NI': 'Spanish (Nicaragua)',
  'es-PA': 'Spanish (Panama)',
  'es-PY': 'Spanish (Paraguay)',
  'es-PE': 'Spanish (Peru)',
  'es-PR': 'Spanish (Puerto Rico)',
  'es-ES': 'Spanish (Spain)',
  'es-UY': 'Spanish (Uruguay)',
  'es-US': 'Spanish (United States)',
  'es-VE': 'Spanish (Venezuela)',
  'su-ID': 'Sundanese (Indonesia)',
  'sw-KE': 'Swahili (Kenya)',
  'sw-TZ': 'Swahili (Tanzania)',
  'sv-SE': 'Swedish (Sweden)',
  'ta-IN': 'Tamil (India)',
  'ta-SG': 'Tamil (Singapore)',
  'ta-LK': 'Tamil (Sri Lanka)',
  'te-IN': 'Telugu (India)',
  'th-TH': 'Thai (Thailand)',
  'tr-TR': 'Turkish (Turkey)',
  'uk-UA': 'Ukrainian (Ukraine)',
  'ur-IN': 'Urdu (India)',
  'ur-PK': 'Urdu (Pakistan)',
  'uz-UZ': 'Uzbek (Uzbekistan)',
  'vi-VN': 'Vietnamese (Vietnam)',
  'cy-GB': 'Welsh (United Kingdom)',
  'zu-ZA': 'Zulu (South Africa)',
};

async function getVoicesAsync(
  key: string,
  region: string
): Promise<VoiceInfo[] | undefined> {
  if (!key || !region) return undefined;
  const speechConfig = SpeechConfig.fromSubscription(key, region);
  const synthesizer = new SpeechSynthesizer(speechConfig);
  let voices: SynthesisVoicesResult | undefined;
  try {
    voices = await synthesizer.getVoicesAsync();
  } catch (e) {
    console.error('unable to get voices:', e);
  }
  synthesizer.close();

  if (voices && voices.voices) {
    return voices.voices;
  }

  return undefined;
}

type VoiceOption = {
  locale: string;
  localName: string;
  shortName: string;
};

const localStorageVoicesList = 'ttsVoicesList';
export const localStorageCacheLimit = 'ttsCacheLimit';

export default function TTSSettings() {
  const classes = useStyles();
  const { t } = useTranslation();

  const [azureApiKey, setAzureApiKey] = React.useState('');
  const [apiKeyErrorMessage, setApiKeyErrorMessage] = React.useState('');

  const [azureRegion, setAzureRegion] = React.useState(
    localStorage.getItem('azureRegion') || ''
  );
  const [azureVoiceLang, setAzureVoiceLang] = React.useState(
    localStorage.getItem('azureVoiceLang') || 'en-US'
  );
  const [azureVoiceName, setAzureVoiceName] = React.useState(
    localStorage.getItem('azureVoiceName') || ''
  );
  const [skipEmotes, setSkipEmotes] = React.useState(
    localStorage.getItem('ttsSkipEmotes') === '1'
  );

  // TODO button to clear cache
  const [cacheLimit, setCacheLimit] = React.useState(
    localStorage.getItem(localStorageCacheLimit) || '500'
  );
  const [cacheLimitError, setCacheLimitError] = React.useState('');

  const [availableVoices, setAvailableVoices] = React.useState<VoiceOption[]>(
    JSON.parse(localStorage.getItem(localStorageVoicesList) || '[]')
  );
  const [azureVoicesListError, setAzureVoicesListError] =
    React.useState<string>('');
  async function updateVoices() {
    let voices: VoiceInfo[] | undefined;
    if (azureApiKey && azureRegion) {
      voices = await getVoicesAsync(azureApiKey, azureRegion);
    }
    if (voices) {
      // NOTE: without copying the voice info, stringifying and loading the VoiceInfo[]
      // using json would not work (e.g. voiceInfo.locale would be undefined)
      const voiceOptions = voices.map((voiceInfo: VoiceInfo) => ({
        locale: voiceInfo.locale,
        localName: voiceInfo.localName,
        shortName: voiceInfo.shortName,
      }));
      localStorage.setItem(
        localStorageVoicesList,
        JSON.stringify(voiceOptions)
      );
      setAvailableVoices(voiceOptions);
      setAzureVoicesListError('');
    } else {
      setAzureVoicesListError(t('Missing/invalid API key or region'));
    }
  }
  useEffect(() => {
    const apiKey = ipcRenderer.sendSync('getAzureKey');
    // eslint-disable-next-line eqeqeq
    if (apiKey != undefined && apiKey !== '') {
      setAzureApiKey(apiKey);
    }
  }, []);

  return (
    <MuiThemeProvider theme={theme}>
      <div className={classes.root}>
        <div className={classes.content}>
          <h2>{t('Text To Speech Settings')}</h2>
          <Grid container direction="row" spacing={3}>
            <Grid item xs={6}>
              <TextField
                className={classes.formControl}
                id="azure-api-key"
                fullWidth
                label={t('Azure Speech API Key')}
                value={azureApiKey}
                error={apiKeyErrorMessage !== ''}
                helperText={apiKeyErrorMessage}
                onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                  const trimmed = e.target.value.trim();
                  if (!trimmed.match(/[a-fA-F0-9]{32}/)) {
                    setApiKeyErrorMessage('Invalid API key');
                  } else {
                    setApiKeyErrorMessage('');
                    ipcRenderer.send('setAzureKey', trimmed);
                  }
                  setAzureApiKey(trimmed);
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                className={classes.formControl}
                id="azure-region"
                fullWidth
                label={t('Azure Region')}
                value={azureRegion}
                onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                  const trimmed = e.target.value.trim();
                  // TODO validation?
                  setAzureRegion(trimmed);
                  localStorage.setItem('azureRegion', trimmed);
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl className={classes.formControl}>
                <InputLabel id="azure-voice-lang-label">
                  {t('Azure Voice Language')}
                </InputLabel>
                <Select
                  labelId="azure-voice-lang-label"
                  id="azure-voice-lang"
                  value={azureVoiceLang}
                  onChange={async (event) => {
                    // TODO fix event.target.value type errors
                    if (event.target.value !== azureVoiceLang) {
                      setAzureVoiceName('');
                      // TODO validation?
                      localStorage.setItem(
                        'azureVoiceLang',
                        event.target.value as string
                      );
                      setAzureVoiceLang(event.target.value as string);
                    }
                  }}
                >
                  {Object.entries(bcp47ToLanuageName).map(
                    ([code, name]: [string, string]) => (
                      <MenuItem key={code} value={code}>
                        {name}
                      </MenuItem>
                    )
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl
                className={classes.formControl}
                error={azureVoicesListError.length > 0}
              >
                <InputLabel id="azure-voice-name-label">
                  {t('Azure Voice Name')}
                </InputLabel>
                <Select
                  labelId="azure-voice-name-label"
                  id="azure-voice-name"
                  value={azureVoiceName}
                  onChange={(e) => {
                    const { value } = e.target;
                    // TODO validation?
                    setAzureVoiceName(value as string);
                    localStorage.setItem('azureVoiceName', value as string);
                  }}
                >
                  {availableVoices.map((voiceOption: VoiceOption) => {
                    if (voiceOption.locale === azureVoiceLang) {
                      return (
                        <MenuItem
                          key={voiceOption.shortName}
                          value={voiceOption.shortName}
                        >
                          {voiceOption.localName}
                        </MenuItem>
                      );
                    }

                    return undefined;
                  })}
                </Select>
                {azureVoicesListError && (
                  <FormHelperText>{azureVoicesListError}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <Button
                id="update-voices"
                variant="contained"
                className={classes.button}
                color="primary"
                disabled={!azureApiKey || !azureRegion}
                onClick={updateVoices}
              >
                {t('Update voices')}
              </Button>
            </Grid>
          </Grid>
          <Grid container direction="row" spacing={3}>
            <Grid item xs={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    style={
                      skipEmotes ? { color: green[500] } : { color: red[500] }
                    }
                    checked={skipEmotes}
                    onChange={(event) => {
                      setSkipEmotes(event.currentTarget.checked);
                      localStorage.setItem(
                        'ttsSkipEmotes',
                        event.currentTarget.checked ? '1' : '0'
                      );
                    }}
                  />
                }
                label={t('Skip emotes')}
                labelPlacement="start"
                style={{ marginLeft: '8px' }}
              />
            </Grid>
          </Grid>
          <Grid container direction="row" spacing={3}>
            <Grid item xs={6}>
              <TextField
                id="cache-limit"
                label="Audio Cache Phrase Limit"
                type="number"
                className={classes.formControl}
                value={cacheLimit}
                InputProps={{ inputProps: { min: 0 } }}
                error={cacheLimitError.length > 0}
                helperText={cacheLimitError}
                onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                  const trimmed = e.target.value.trim();
                  if (!trimmed.match(/^[0-9]+$/)) {
                    setCacheLimitError(
                      'Cache limit needs to be a whole number >= 0'
                    );
                  } else {
                    setCacheLimitError('');
                    localStorage.setItem(localStorageCacheLimit, trimmed);
                  }
                  setCacheLimit(trimmed);
                }}
              />
            </Grid>
          </Grid>
          <Grid container direction="row" spacing={3}>
            <Grid item xs={12}>
              <KeybindConfig />
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
