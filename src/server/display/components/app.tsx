import React, { useRef, useEffect, useReducer } from 'react';
import * as ReactDOM from 'react-dom/client';

import { makeStyles, createStyles } from '@material-ui/core/styles';
import { Howl } from 'howler';
import { io } from 'socket.io-client';

const socket = io();
const DEFAULT_TIMEOUT = 4000;

const useStyles = makeStyles(() =>
  createStyles({
    root: {
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
      // both set individually on SpeechPhrase/Display
      // color: 'white',
      // fontSize: '3rem',
      fontFamily: "'Baloo Da 2', cursive",
      wordBreak: 'break-word',
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bubble: (props: any) => ({
      backgroundColor: props.bubbleColor,
      padding: '20px',
      border: '3px solid #a9a9a9',
      borderRadius: '8px',
    }),
    sepBubbles: {
      marginTop: '5px',
    },
    bubbleContainter: {
      display: 'flex',
      flexDirection: 'column',
      position: 'absolute',
      bottom: 0,
      left: 0,
    },
    span: {
      display: 'block',
      position: 'relative',
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nameTag: (props: any) => ({
      top: -6 + props.fontSize / -8,
      left: Math.max(-10, -4 + props.fontSize / -9.5),
      fontSize: props.fontSize / 4,
      border: '1px solid #E0e3e7',
      borderRadius: '10px',
      verticalAlign: 'middle',
      boxSizing: 'border-box',
      margin: 0,
      padding: 0,
      paddingLeft: '8px',
      paddingRight: '8px',
      position: 'absolute',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      maxWidth: '100%',
    }),
    emoji: {
      verticalAlign: 'middle',
    },
    hidden: {
      display: 'none',
    },
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
const SpeechDisplay = React.forwardRef<
  HTMLSpanElement,
  { settings: OnScreenSettings; nameTag?: string }
>((_props: { settings: OnScreenSettings; nameTag?: string }, ref) => {
  const classes = useStyles({ fontSize: _props.settings.fontSize });
  return (
    <span
      ref={ref}
      className={classes.span}
      style={{ marginTop: _props.nameTag ? _props.settings.fontSize / 8 : '0' }}
    >
      {_props.nameTag && (
        <span className={classes.nameTag}>{_props.nameTag}</span>
      )}
    </span>
  );
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
const emoteRequest = async (
  value: string
): Promise<{ found: boolean; value: string }> => {
  const url = new URL('http://localhost:4563/emotes');
  url.searchParams.append('string', value);
  const response = await fetch(url.toString());
  return response.json();
};

let emoteNameToUrl: { [key: string]: string } = {};

function Emote(attrs: { emoteName: string }) {
  const { emoteName } = attrs;
  const classes = useStyles({});
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

type OnScreenSettings = {
  speed: number;
  fontSize: number;
  fontColor: string;
  fontWeight: number;
  soundFileName: string;
  volume: number;
  bubbleColor: string;
};

type SpeechPhraseProps = {
  key: string;
  runningId: number;
  dispatchRef: React.MutableRefObject<(action: ReducerAction) => void>;
  message: string;
  settings: OnScreenSettings;
  nameTag?: string;
  fontColor: string;
  bubbleColor: string;
};

function SpeechPhrase(props: SpeechPhraseProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const speechDisplay = useRef<HTMLSpanElement | null>(null);
  const { message, settings, nameTag, fontColor } = props;
  const classes = useStyles({
    bubbleColor: props.bubbleColor,
    fontSize: props.settings.fontSize,
  });

  // TODO Test for performance impact of reading settings on every input
  const { speed } = settings;
  const { fontSize } = settings;
  const { fontWeight } = settings;
  const { soundFileName } = settings;

  const speechSound = new Howl({
    src: [`../assets/sounds/${soundFileName}`],
    volume: settings.volume,
  });
  // const regex = /:([^:]+):/g;
  // const emojis = [...message.matchAll(regex)];
  const timeBetweenChars: number = 150 - speed;
  // sometimes the regular emoji codes can be followed by optional modifiers
  // that start with a double colon, but uEmojiParser doesn't support them
  // since twitter/github etc. dont use them
  const emojiRegex = /:([^:\s]*):/g;
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
    if (!speechDisplay.current)
      throw new Error('speechDisplay not initialized');
    speechDisplay.current.style.fontSize = `${fontSize}px`;
    speechDisplay.current.style.color = fontColor;
    speechDisplay.current.style.fontWeight = fontWeight.toString();

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
            if (!wasOnScreen) {
              if (entry.isIntersecting && entry.intersectionRatio >= 1) {
                // element was fully visible on the viewport
                wasOnScreen = true;
              }
            } else if (
              !entry.isIntersecting &&
              // NOTE: an intersection with the viewport only triggers on the thresholds
              // that were passed in the options obj, so techinchally don't have to check
              // this
              entry.intersectionRatio <= 0 &&
              !sentRemoveAction &&
              i >= message.length
            ) {
              // was fully displayed on screen but reached the top of the viewport, where
              // now no portion of the element is visible anymore
              sentRemoveAction = true;
              props.dispatchRef.current({
                type: 'remove',
                id: props.runningId,
              });
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
    const typewriter = async () => {
      if (!speechDisplay.current)
        throw new Error('speechDisplay not initialized');

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

          const resp = await emoteRequest(emojiString);
          if (resp.found) {
            const emojiContainer = document.createElement('span');
            emojiContainer.innerHTML = resp.value;
            emojiContainer.children[0].classList.add(classes.emoji);
            speechDisplay.current.appendChild(emojiContainer);
          } else {
            // no emoji found -> output it as normal text, which is probably
            // better than not outputting anything at all
            const tempTextContainer = document.createElement('span');
            tempTextContainer.textContent = emojiString;
            speechDisplay.current.appendChild(tempTextContainer);
          }
        } else if (foundEmote) {
          // end previous text fragment
          currentTextFragment = null;

          const emoteName = foundEmote[0];
          const emoteContainer = document.createElement('span');
          const root = ReactDOM.createRoot(emoteContainer);
          root.render(<Emote emoteName={emoteName} />);
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
            props.dispatchRef.current({ type: 'remove', id: props.runningId });
          }
        }, timeout);
      }
    };
    setTimeout(typewriter, 0);
    // Only register timer interactions once per component regardless of state change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (nameTag) {
    // collab
    return (
      <div className={`${classes.bubble} ${classes.sepBubbles}`}>
        <SpeechDisplay
          ref={speechDisplay}
          nameTag={nameTag}
          settings={props.settings}
        />
      </div>
    );
  } else {
    return (
      <SpeechDisplay
        ref={speechDisplay}
        nameTag={nameTag}
        settings={props.settings}
      />
    );
  }
}

interface Phrase {
  message: string;
  key: string;
  runningId: number;
  nameTag?: string;
  fontColor: string;
  bubbleColor: string;
}

type State = {
  phrases: Phrase[];
  settings: OnScreenSettings;
};

type ReducerAction =
  | ReducerActionPush
  | ReducerActionShift
  | ReducerActionRemove;

type ReducerActionPush = {
  type: 'push';
  phrase: Phrase;
  settings: OnScreenSettings;
};
type ReducerActionShift = {
  type: 'shift';
};
type ReducerActionRemove = {
  type: 'remove';
  id: number;
};

const defaultSettings: OnScreenSettings = {
  speed: 75,
  fontSize: 48,
  fontColor: '#ffffff',
  fontWeight: 400,
  soundFileName: '',
  volume: 50,
  bubbleColor: '#000',
};

export default function App(props: { collab: boolean }) {
  const { collab } = props;
  // state will only update on a re-render...
  const stateRef: React.MutableRefObject<State> = useRef({
    phrases: [],
    settings: defaultSettings,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function reducer(state: State, action: ReducerAction) {
    let result: State;
    switch (action.type) {
      case 'push':
        result = {
          phrases: [...state.phrases, action.phrase],
          settings: action.settings,
        };
        break;
      case 'shift':
        result = {
          phrases: state.phrases.slice(1),
          settings: state.settings,
        };
        break;
      case 'remove': {
        result = {
          phrases: state.phrases.filter(
            (phrase: Phrase) => phrase.runningId !== action.id
          ),
          settings: state.settings,
        };
        break;
      }
      default:
        result = state;
        break;
    }

    // this react architecture turns such a simple thing into an absolute clusterfuck
    stateRef.current = result;

    return result;
  }

  const [state, dispatch] = useReducer(reducer, stateRef.current);
  // useRef can be thought of as a instance variable for functional components
  // phrase ids waiting for removal (since older ids are still alive)
  const waiting: React.MutableRefObject<{ [id: number]: boolean }> = useRef({});
  const wrappedDispatch = useRef((action: ReducerAction) => {
    if (action.type === 'remove') {
      // we know id will not be undefined when action==="shift"
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const id: number = action.id!;
      // state will only update on re-render and since this is a closure we will be
      // using the initial state forever -> use a Ref
      const oldest =
        stateRef.current.phrases.length > 0
          ? stateRef.current.phrases[0].runningId
          : id;
      if (id > oldest) {
        // we don't allow removing phrases that aren't the last phrase, so we keep
        // track of items that are waiting for removal
        waiting.current[id] = true;
      } else {
        const youngerSibling = id + 1;
        const removeNext = waiting.current[youngerSibling];
        if (removeNext === true) {
          const REMOVE_DELAY = 500; // ms
          // remove next younger sibling that is waiting with a delay
          // we call ourselves so other waiting siblings will get removed as well
          setTimeout(() => {
            wrappedDispatch.current({ type: 'remove', id: youngerSibling });
          }, REMOVE_DELAY);
          // remove element from waiting q
          delete waiting.current[youngerSibling];
        }

        dispatch({ type: 'shift' });
      }
    } else {
      dispatch(action);
    }
  });

  useEffect(() => {
    let runningId = 0;

    // NOTE: this has to remain in the useEffect hook, since we use SSR and
    // window will be undefined on the server
    const params = new URLSearchParams(window.location.search);
    let filterNick = params.get('nick');
    if (filterNick) filterNick = filterNick.toLowerCase();

    const eventName = collab ? 'collabPhraseRender' : 'phraseRender';
    socket.on(eventName, (data) => {
      // skip other nameTags if we got passed a nickname to filter for in query params
      if (
        collab &&
        filterNick &&
        data.nameTag &&
        data.nameTag.toLowerCase() !== filterNick
      )
        return;
      const key: string = uniqueHash();
      const message: string = data.phrase;
      dispatch({
        type: 'push',
        phrase: {
          message,
          key,
          runningId,
          nameTag: collab ? data.nameTag : undefined,
          fontColor: data.settings.fontColor,
          bubbleColor: data.settings.bubbleColor,
        },
        settings: data.settings,
      });

      runningId += 1;
    });

    socket.on('updateEmoteMapClient', (data) => {
      if (data.emoteNameToUrl) emoteNameToUrl = data.emoteNameToUrl;
    });

    return () => {
      socket.disconnect();
    };
    // collab can't change after receiving it, so it doesn't need to be in the deps array
  }, []);

  const classes = useStyles({ bubbleColor: state.settings.bubbleColor });
  return (
    <div className={classes.root}>
      <div
        className={`${
          state.phrases.length <= 0 ? classes.hidden : classes.bubbleContainter
        } ${classes.text} ${collab ? '' : classes.bubble}`}
      >
        {state.phrases.map((phrase: Phrase) => {
          return (
            <SpeechPhrase
              key={phrase.key}
              runningId={phrase.runningId}
              message={phrase.message}
              dispatchRef={wrappedDispatch}
              settings={state.settings}
              nameTag={phrase.nameTag}
              fontColor={phrase.fontColor}
              bubbleColor={phrase.bubbleColor}
            />
          );
        })}
      </div>
    </div>
  );
}
