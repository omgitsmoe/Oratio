import React, { useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  Grid,
  Typography,
  Tooltip,
} from '@material-ui/core';
import { makeStyles, createStyles } from '@material-ui/core/styles';
import MUIMenuItem from '@material-ui/core/MenuItem';
import WavesIcon from '@material-ui/icons/Waves';
import SpeedIcon from '@material-ui/icons/Speed';
import { useTranslation } from 'react-i18next';
import { Warning } from '@material-ui/icons';
import { red } from '@material-ui/core/colors';
import * as Theme from './Theme';
import SliderWithIcon from './settings/SliderWithIcon';
import VolumeSlider from './settings/VolumeSlider';
import { voiceStyles } from '../TTSAzure';
import VoiceConfigBar, { VoiceConfig } from './VoiceConfigBar';

const theme = Theme.default();
const useStyles = makeStyles(() =>
  createStyles({
    formControl: {
      margin: theme.spacing(0),
      minWidth: '100%',
    },
    warning: {
      marginLeft: '.25em',
      color: red[300],
    },
  })
);

export default function TTSConfig(props: {
  voiceStyle: string;
  voiceVolume: number;
  voicePitch: number;
  voiceRate: number;
  getCurrentSettings: () => VoiceConfig;
  handleConfigLoad: (name: string, value: VoiceConfig) => void;
  onStyleChange: (value: string) => void;
  onVolumeChange: (value: number) => void;
  onPitchChange: (value: number) => void;
  onRateChange: (value: number) => void;
}) {
  const { t } = useTranslation();
  const classes = useStyles();

  const {
    voiceStyle,
    voiceVolume,
    voicePitch,
    voiceRate,
    // TODO: use the VoiceConfigBar in the parent directly instead?
    getCurrentSettings,
    handleConfigLoad,
    onStyleChange,
    onVolumeChange,
    onPitchChange,
    onRateChange,
  } = props;

  // NOTE: the official reactjs docs recommend having the state in the parent and providing an
  // on change callback to the child as a prop (see "lifting up state")
  // that leaves all of the complexity in the parent even though I wanted to spread the complexity
  // and it still means the parent (which by definition contains more components) has to
  // re-render...
  // so every slider change triggers a re-render OF THE PARENT!!!!
  // => use state inside the component that changes everytime the sliders are dragged
  // but only call the callbacks once the slider gets the mouseup event
  const [tempVoiceVolume, setTempVoiceVolume] = React.useState(voiceVolume);
  const [tempVoicePitch, setTempVoicePitch] = React.useState(voicePitch);
  const [tempVoiceRate, setTempVoiceRate] = React.useState(voiceRate);

  // useState's initial value is only initialized once even if the props update after
  useEffect(() => {
    setTempVoiceVolume(voiceVolume);
    setTempVoicePitch(voicePitch);
    setTempVoiceRate(voiceRate);
  }, [voiceVolume, voicePitch, voiceRate]);

  return (
    <>
      <Grid container direction="row" spacing={3}>
        <Grid item xs={6} container alignItems="center">
          <Typography variant="h5" component="h1">
            {t('TTS Settings')}
          </Typography>
          <Tooltip
            title={
              <>
                <Typography variant="body2">
                  {t('tts-usage-warning')}
                </Typography>
              </>
            }
            className={classes.warning}
          >
            <Warning />
          </Tooltip>
        </Grid>
        <Grid
          item
          xs={6}
          container
          alignItems="center"
          justifyContent="flex-end"
        >
          <VoiceConfigBar
            getCurrentSettings={getCurrentSettings}
            configLoadCallback={handleConfigLoad}
          />
        </Grid>
      </Grid>
      <Grid container direction="row" spacing={3}>
        <Grid item xs={6}>
          <FormControl className={classes.formControl}>
            <InputLabel id="azure-voice-style-label">
              {t('Voice style')}
            </InputLabel>
            <Select
              labelId="azure-voice-style-label"
              id="azure-voice-style"
              value={voiceStyle}
              onChange={(e) => {
                const { value } = e.target;
                onStyleChange(value as string);
              }}
            >
              <MUIMenuItem key="none" value="none">
                none
              </MUIMenuItem>
              {Object.entries(voiceStyles).map(
                ([name, _description]: [string, string]) => (
                  <MUIMenuItem key={name} value={name}>
                    {name}
                  </MUIMenuItem>
                )
              )}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6}>
          <VolumeSlider
            value={tempVoiceVolume}
            label={t('Volume')}
            valueDisplay="auto"
            onChange={(event, value) => {
              setTempVoiceVolume(value as number);
            }}
            onChangeCommitted={(event, value) => {
              onVolumeChange(value as number);
            }}
          />
        </Grid>
      </Grid>
      <Grid container direction="row" spacing={3}>
        <Grid item xs={6}>
          <SliderWithIcon
            value={tempVoicePitch}
            label={t('Pitch (+/- in %)')}
            min={-100}
            max={100}
            step={1}
            onChange={(event, value) => {
              setTempVoicePitch(value as number);
            }}
            onChangeCommitted={(event, value) => {
              onPitchChange(value as number);
            }}
            icon={<WavesIcon />}
          />
        </Grid>
        <Grid item xs={6}>
          <SliderWithIcon
            value={tempVoiceRate}
            label={t('Rate')}
            min={0}
            max={3}
            step={0.01}
            onChange={(event, value) => {
              setTempVoiceRate(value as number);
            }}
            onChangeCommitted={(event, value) => {
              onRateChange(value as number);
            }}
            icon={<SpeedIcon />}
          />
        </Grid>
      </Grid>
    </>
  );
}
