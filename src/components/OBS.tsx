import React, { useRef, useEffect, useReducer } from 'react';
import ReactDOM from 'react-dom';

import { makeStyles, createStyles } from '@material-ui/core/styles';
import { Howl } from 'howler';
import uEmojiParser from 'universal-emoji-parser';
import { Emote, emoteNameToUrl } from './Emotes';

const ipc = require('electron').ipcRenderer;

const DEFAULT_TIMEOUT = 4000;

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      backgroundColor: 'blue !important',
      height: '100%',
      width: '100%',
      position: 'absolute',
      top: 0,
      left: 0,
      // so we don't get a scrollbar; this will not actually hide any content
      // since it would've been outside the window anyway
      overflow: 'hidden',
    },
    text: {
      color: 'white',
      fontSize: '3rem',
      fontFamily: "'Baloo Da 2', cursive",
      wordBreak: 'break-word',
    },
    bubble: {
      backgroundColor: localStorage.getItem('bubbleColor') || '#000',
      padding: '20px',
      border: '3px solid #a9a9a9',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      position: 'absolute',
      bottom: 0,
      left: 0,
    },
    span: {
      display: 'block',
    },
    emoji: {
      verticalAlign: 'middle',
    },
    hidden: {
      display: 'none',
    },
  })
);

// eslint-disable-next-line react/display-name
const SpeechDisplay = React.forwardRef<HTMLSpanElement>((_props, ref) => {
  const classes = useStyles();
  return <span ref={ref} className={classes.span} />;
});

function uniqueHash() {
  const alpha =
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const length = 8;
  let rtn = '';
  for (let i = 0; i < length; i += 1) {
    rtn += alpha.charAt(Math.floor(Math.random() * alpha.length));
  }
  return rtn;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SpeechPhrase(props: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const speechDisplay: any = useRef<HTMLSpanElement>(null);
  const { message } = props;
  const classes = useStyles();

  // TODO Test for performance impact of reading settings on every input
  const speed = parseInt(localStorage.getItem('textSpeed') || '75', 10);
  const fontSize = parseInt(localStorage.getItem('fontSize') || '48', 10);
  const fontColor = localStorage.getItem('fontColor') || '#ffffff';
  const fontWeight = parseInt(localStorage.getItem('fontWeight') || '400', 10);
  const soundFileName = localStorage.getItem('soundFileName');
  const speechSound = new Howl({
    src: [`../assets/sounds/${soundFileName}`],
    volume: parseFloat(localStorage.getItem('volume') || '50') / 100,
  });
  const timeBetweenChars: number = 150 - speed;
  const emojiRegex = /:([^:]+):/g;
  const emojis = [...message.matchAll(emojiRegex)].filter(
    (e) => uEmojiParser.parse(e[0]) !== e[0]
  );
  const emotes = [...message.matchAll(/\w+/g)].filter(
    (e) => e[0] in emoteNameToUrl
  );

  // Account for the time to print a message so it doesn't disappear early
  const timeout: number =
    message.length * timeBetweenChars +
    (message.length > 0 ? DEFAULT_TIMEOUT : 0);

  useEffect(() => {
    speechDisplay.current.style.fontSize = fontSize;
    speechDisplay.current.style.color = fontColor;
    speechDisplay.current.style.fontWeight = fontWeight;

    let currentTextFragment: HTMLSpanElement | null = null;
    // `i` is the message character index
    let i = 0;
    const typewriter = () => {
      if (i < message.length) {
        speechSound.stop();
        if (message.charAt(i) !== ' ') {
          speechSound.play();
        }

        // TODO: the reference object is initialized as null but sometimes comes
        // through as null here even though it is mounted on the component
        // hack to bypass this but should figure out why
        if (speechDisplay.current) {
          // Check whether this character is the start of an emoji or emote.
          const foundEmoji = emojis.find((emoji) => emoji.index === i);
          const foundEmote = emotes.find((emote) => emote.index === i);
          if (foundEmoji) {
            // end previous text fragment
            currentTextFragment = null;

            const emojiString = foundEmoji[0];
            const emojiContainer = document.createElement('span');
            // speechDisplay.current.innerHTML += uEmojiParser.parse(emojiString);
            emojiContainer.innerHTML = uEmojiParser.parse(emojiString);
            emojiContainer.children[0].classList.add(classes.emoji);
            speechDisplay.current.appendChild(emojiContainer);
            i += emojiString.length;
          } else if (foundEmote) {
            // end previous text fragment
            currentTextFragment = null;

            const emoteName = foundEmote[0];
            const emoteContainer = document.createElement('span');
            ReactDOM.render(<Emote emoteName={emoteName} />, emoteContainer);
            speechDisplay.current.appendChild(emoteContainer);
            i += emoteName.length;
          } else {
            // we put the text into its own element so we can use textContent
            if (currentTextFragment === null) {
              currentTextFragment = document.createElement('span');
              speechDisplay.current.appendChild(currentTextFragment);
            }

            // TODO: Doublecheck escaping.
            currentTextFragment.textContent += message.charAt(i);
            i += 1;
          }
        }

        setTimeout(typewriter, timeBetweenChars);
      } else {
        setTimeout(() => {
          // TODO: the reference object is initialized as null but sometimes comes
          // through as null here even though it is mounted on the component
          // hack to bypass this but should figure out why
          // TODO: this causes the empty div with class 'bubble' to remain as empty
          // box on screen sometimes
          if (speechDisplay.current) {
            speechDisplay.current.innerHTML = '';
          }
          props.dispatch({ type: 'shift' });
        }, timeout);
      }
    };
    setTimeout(typewriter, 0);
    // Only register timer interactions once per component regardless of state change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <SpeechDisplay ref={speechDisplay} />;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function reducer(state: any, action: any) {
  switch (action.type) {
    case 'push':
      return { phrases: [...state.phrases, action.phrase] };
    case 'shift':
      return { phrases: state.phrases.slice(1) };
    default:
      return state;
  }
}

export default function OBS() {
  const [state, dispatch] = useReducer(reducer, { phrases: [] });

  // Only register ipc speech callback once after component is mounted
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ipc.on('speech', (_event: any, message: any) => {
      const key: string = uniqueHash();
      dispatch({ type: 'push', phrase: { message, key } });
    });
  }, []);

  const classes = useStyles();
  return (
    <div className={classes.root}>
      <div
        className={`${
          state.phrases.length <= 0 ? classes.hidden : classes.bubble
        } ${classes.text}`}
      >
        {state.phrases.map((phrase: { message: string; key: string }) => {
          return (
            <SpeechPhrase
              key={phrase.key}
              message={phrase.message}
              dispatch={dispatch}
            />
          );
        })}
      </div>
    </div>
  );
}
