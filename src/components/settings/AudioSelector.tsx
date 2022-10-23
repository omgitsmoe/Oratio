import React, { useEffect } from 'react';

import { makeStyles, createStyles } from '@material-ui/core/styles';
import { FormControl, InputLabel, MenuItem, Select } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import * as Theme from '../Theme';

const theme = Theme.default();
const useStyles = makeStyles(() =>
  createStyles({
    root: {
      margin: theme.spacing(1),
      minWidth: '100%',
    },
    rootNoMargin: {
      minWidth: '100%',
    },
  })
);

export default function AudioSelector(props: {
  localStorageName: string;
  noMargin?: boolean;
}) {
  const { t } = useTranslation();
  const { localStorageName, noMargin = false } = props;
  const [sound, setSound] = React.useState('');
  const [soundOptions, setSoundOptions] = React.useState<string[]>([]);

  useEffect(() => {
    (async () => {
      setSoundOptions(await window.electronAPI.getDirListingSounds());
      setSound(localStorage.getItem(localStorageName) || '');
    })();
  }, []);

  const handleSoundChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSound(event.target.value as string);
    localStorage.setItem(localStorageName, event.target.value as string);
  };

  const classes = useStyles();
  const style = noMargin ? classes.rootNoMargin : classes.root;
  return (
    <div>
      <FormControl className={style}>
        <InputLabel id="demo-simple-select-label">
          {t('Speech Sound')}
        </InputLabel>
        <Select
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          value={sound}
          autoWidth
          onChange={handleSoundChange}
        >
          {soundOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  );
}
