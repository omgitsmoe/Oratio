import React, { useRef, useEffect, useReducer } from 'react';
import ReactDOM from 'react-dom';

import { makeStyles, createStyles } from '@material-ui/core/styles';
import { Howl } from 'howler';
import { io } from 'socket.io-client';

const socket = io();
const DEFAULT_TIMEOUT = 4000;

const useStyles = makeStyles(() =>
  createStyles({
    root: () => ({
      height: '100%',
      width: '100%',
      position: 'absolute',
      top: 0,
      left: 0,
      // so we don't get a scrollbar; this will not actually hide any content
      // since it would've been outside the window anyway
      overflow: 'hidden',
    }),
    text: () => ({
      color: 'white',
      fontSize: '3rem',
      fontFamily: "'Baloo Da 2', cursive",
      wordBreak: 'break-word',
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bubble: (props: any) => ({
      backgroundColor: props.bubbleColor,
      padding: '20px',
      border: '3px solid #a9a9a9',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      position: 'absolute',
      bottom: 0,
      left: 0,
    }),
    span: () => ({
      display: 'block',
    }),
    emoji: {
      verticalAlign: 'middle',
    },
    hidden: () => ({
      display: 'none',
    }),
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

// eslint-disable-next-line react/display-name
const SpeechDisplay = React.forwardRef<HTMLSpanElement>((_props, ref) => {
  const classes = useStyles(_props);
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

// Get emote element from the server as the client bundle fails to load them
const emoteRequest = async (value: string) => {
  const url = new URL('http://localhost:4563/emotes');
  url.searchParams.append('string', value);
  const response = await fetch(url.toString());
  return response.json();
};

// const emoteNameToUrl = JSON.parse(localStorage.getItem('emoteNameToUrl') || '');
let emoteNameToUrl: { [key: string]: string } = {};

function Emote(attrs: { emoteName: string }) {
  const { emoteName } = attrs;
  const classes = useStyles({
    emote: {
      display: 'inline-block',
      width: 'auto',
      height: 'auto',
      'max-height': '2em',
      'max-width': '1000px',
      verticalAlign: 'middle',
    },
  });
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

// TODO: figure out a way to remove all this duplicate code and merge it
// with src/components/OBS.tsx; my webpack knowledge is not good enough

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SpeechPhrase(props: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const speechDisplay: any = useRef<HTMLSpanElement>(null);
  const { message, settings } = props;
  const classes = useStyles(props);

  // TODO Test for performance impact of reading settings on every input
  const { speed } = settings;
  const { fontSize } = settings;
  const { fontColor } = settings;
  const { fontWeight } = settings;
  const { soundFileName } = settings;
  emoteNameToUrl = settings.emoteNameToUrl;

  const speechSound = new Howl({
    src: [`../assets/sounds/${soundFileName}`],
    volume: settings.volume,
  });
  // const regex = /:([^:]+):/g;
  // const emojis = [...message.matchAll(regex)];
  const timeBetweenChars: number = 150 - speed;
  const emojiRegex = /:([^:]+):/g;
  const emojis = [...message.matchAll(emojiRegex)];
  const emotes = [...message.matchAll(/\w+/g)].filter(
    (e) => e[0] in emoteNameToUrl
  );

  const timePerChar = 40; // avg reading speed is 25 letters/s -> 40ms/letter
  const clamp = (num: number, min: number, max: number) =>
    Math.min(Math.max(num, min), max);
  // increase time on screen based on message length after it's done animating
  // max of an extra 15s
  const timeout: number =
    DEFAULT_TIMEOUT + clamp(timePerChar * message.length, 0, 15000);

  useEffect(() => {
    speechDisplay.current.style.fontSize = fontSize;
    speechDisplay.current.style.color = fontColor;
    speechDisplay.current.style.fontWeight = fontWeight;

    // `i` is the message character index
    let i = 0;
    let wasOnScreen = false;
    // so we don't trigger multiple "shift" actions
    let sentRemoveAction = false;

    // watch for intersection events for our speechDisplay so we know
    // when it enters and leaves the viewport
    const observer = new IntersectionObserver(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (entries, _observer) => {
        entries.forEach((entry) => {
          if (entry.target === speechDisplay.current) {
            // NOTE: an intersection with the viewport only triggers when the
            // element touches one of the edge of the viewport, so it won't fire
            // when an object enters the screen without touching any edge
            // because of this intersectionRatio in this case mean how far is
            // the element outside of the screen
            if (!wasOnScreen) {
              if (entry.isIntersecting && entry.intersectionRatio >= 1) {
                // element was fully visible on the viewport
                wasOnScreen = true;
              }
            } else if (
              !entry.isIntersecting &&
              entry.intersectionRatio <= 0 &&
              !sentRemoveAction &&
              i >= message.length
            ) {
              // was fully displayed on screen but reached the top of the viewport, where
              // now no portion of the element is visible anymore
              sentRemoveAction = true;
              props.dispatch({ type: 'shift', id: props.runningId });
            }
          }
        });
      },
      {
        // watch for intersection with viewport
        root: null,
        // margins around root intersection
        rootMargin: '0px',
        // event will only fire for these thresholds:
        // 1 -> fire event once 100% of the elemnt is shown
        threshold: [1, 0],
      }
    );

    // TODO: can the speechDisplay.current ref still be null here?
    observer.observe(speechDisplay.current);

    let currentTextFragment: HTMLSpanElement | null = null;
    const typewriter = () => {
      if (i < message.length) {
        speechSound.stop();

        // TODO: Audio play does not seem to come through on browser load
        if (message.charAt(i) !== ' ') {
          speechSound.play();
        }

        // Check whether this character is the start of an emoji or emote.
        const foundEmoji = emojis.find((emoji) => emoji.index === i);
        const foundEmote = emotes.find((emote) => emote.index === i);
        if (foundEmoji) {
          // end previous text fragment
          currentTextFragment = null;

          const emojiString = foundEmoji[0];
          i += emojiString.length;

          emoteRequest(emojiString)
            .then((data) => {
              if (data.found) {
                const emojiContainer = document.createElement('span');
                emojiContainer.innerHTML = data.value;
                emojiContainer.children[0].classList.add(classes.emoji);
                speechDisplay.current.appendChild(emojiContainer);
              } // else {
              //   playSound = false;
              // }
              return emojiString;
            })
            .catch((error) => {
              throw error;
            });
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

        setTimeout(typewriter, timeBetweenChars);
      } else {
        // message done "animating" queue the removal
        setTimeout(() => {
          if (!sentRemoveAction) {
            sentRemoveAction = true;
            props.dispatch({ type: 'shift', id: props.runningId });
          }
        }, timeout);
      }
    };
    setTimeout(typewriter, 0);
    // Only register timer interactions once per component regardless of state change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <SpeechDisplay ref={speechDisplay} />;
}

interface Phrase {
  message: string;
  key: string;
  runningId: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function reducer(state: any, action: any) {
  switch (action.type) {
    case 'push':
      return {
        phrases: [...state.phrases, action.phrase],
        settings: action.settings,
      };
    case 'shift':
      // NOTE: changed this to remove a specific id since:
      // shorter messages that are newer could get removed before an older and longer
      // message will finish to animate and thus the old message will be removed
      // instead of the new one since .slice(1) just removes the oldest message
      return {
        phrases: state.phrases.filter(
          (phrase: Phrase) => phrase.runningId !== action.id
        ),
        settings: state.settings,
      };
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, { phrases: [], settings: {} });

  useEffect(() => {
    let runningId = 0;
    socket.on('phraseRender', (data) => {
      const key: string = uniqueHash();
      const message: string = data.phrase;
      dispatch({
        type: 'push',
        phrase: { message, key, runningId },
        settings: data.settings,
      });

      runningId += 1;
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const classes = useStyles({ bubbleColor: state.settings.bubbleColor });
  return (
    <div className={classes.root}>
      <div
        className={`${
          state.phrases.length <= 0 ? classes.hidden : classes.bubble
        } ${classes.text}`}
      >
        {state.phrases.map((phrase: Phrase) => {
          return (
            <SpeechPhrase
              key={phrase.key}
              runningId={phrase.runningId}
              message={phrase.message}
              dispatch={dispatch}
              settings={state.settings}
            />
          );
        })}
      </div>
    </div>
  );
}
