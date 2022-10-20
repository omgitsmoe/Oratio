import React from 'react';

import { makeStyles, createStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(() =>
  createStyles({
    emote: {
      display: 'inline-block',
      width: 'auto',
      height: 'auto',
      'max-height': '2em',
      'max-width': '1000px',
      verticalAlign: 'middle',
    },
  })
);

export function Emote(attrs: {
  emoteName: string;
  emoteNameToUrl: { [key: string]: string };
}) {
  const { emoteName, emoteNameToUrl } = attrs;
  const classes = useStyles();
  if (emoteName in emoteNameToUrl) {
    return (
      <img
        src={emoteNameToUrl[emoteName]}
        className={classes.emote}
        alt={emoteName}
      />
    );
  }
  return <span>{emoteName}</span>;
}
