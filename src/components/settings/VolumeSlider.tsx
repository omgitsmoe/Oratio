import React from 'react';

import { Grid, Slider, Typography } from '@material-ui/core';
import { VolumeDown, VolumeUp } from '@material-ui/icons';

export type VolumeSliderProps = {
  value: number;
  label: string;
  valueDisplay: 'on' | 'off' | 'auto';
  onChange?: (
    event: React.ChangeEvent<unknown>,
    newValue: number | number[]
  ) => void;
  onChangeCommitted?: (
    event: React.ChangeEvent<unknown>,
    value: number | number[]
  ) => void;
};

export default function VolumeSlider({
  value,
  label,
  valueDisplay,
  onChange = undefined,
  onChangeCommitted = undefined,
}: VolumeSliderProps) {
  return (
    <div>
      <Typography id="continuous-slider" gutterBottom>
        {label}
      </Typography>
      <Grid container spacing={3}>
        <Grid item>
          <VolumeDown />
        </Grid>
        <Grid item xs>
          <Slider
            value={value}
            onChange={onChange}
            onChangeCommitted={onChangeCommitted}
            aria-labelledby="continuous-slider"
            valueLabelDisplay={valueDisplay}
          />
        </Grid>
        <Grid item>
          <VolumeUp />
        </Grid>
      </Grid>
    </div>
  );
}
