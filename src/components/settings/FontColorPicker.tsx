import React from 'react';

import { Grid, Typography } from '@material-ui/core';
import ColorLensIcon from '@material-ui/icons/ColorLens';
import { SketchPicker } from 'react-color';
import { useTranslation } from 'react-i18next';

export default function FontColorPicker(props: { localStorageName: string }) {
  const { t } = useTranslation();
  const { localStorageName } = props;
  const initColor = localStorage.getItem(localStorageName) || '#ffffff';
  const [fontColor, setFontColor] = React.useState<string>(initColor);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFontColorChange = (color: any) => {
    setFontColor(color.hex);
    localStorage.setItem(localStorageName, color.hex);
  };

  return (
    <div>
      <Typography id="color-selector" gutterBottom>
        <ColorLensIcon /> {t('Text Color')}
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs>
          <SketchPicker
            color={fontColor}
            onChangeComplete={handleFontColorChange}
          />
        </Grid>
      </Grid>
    </div>
  );
}
