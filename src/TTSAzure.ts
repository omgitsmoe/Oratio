import {
  SpeechConfig,
  SpeechSynthesizer,
  AudioConfig,
  SpeakerAudioDestination,
} from 'microsoft-cognitiveservices-speech-sdk';
import uEmojiParser from 'universal-emoji-parser';
import { emoteNameToUrl } from './components/Emotes';

export const voiceStyles: { [key: string]: string } = {
  'advertisement-upbeat':
    'Expresses an excited and high-energy tone for promoting a product or service.',
  affectionate:
    'Expresses a warm and affectionate tone, with higher pitch and vocal energy. The speaker is in a state of ' +
    'attracting the attention of the listener. The personality of the speaker is often endearing in nature.',
  angry: 'Expresses an angry and annoyed tone.',
  assistant: 'Expresses a warm and relaxed tone for digital assistants.',
  calm:
    'Expresses a cool, collected, and composed attitude when speaking. Tone, pitch, and prosody are ' +
    'more uniform compared to other types of speech.',
  chat: 'Expresses a casual and relaxed tone.',
  cheerful: 'Expresses a positive and happy tone.',
  customerservice:
    'Expresses a friendly and helpful tone for customer support.',
  depressed:
    'Expresses a melancholic and despondent tone with lower pitch and energy.',
  disgruntled:
    'Expresses a disdainful and complaining tone. Speech of this emotion displays displeasure and contempt.',
  embarrassed:
    'Expresses an uncertain and hesitant tone when the speaker is feeling uncomfortable.',
  empathetic: 'Expresses a sense of caring and understanding.',
  envious:
    'Expresses a tone of admiration when you desire something that someone else has.',
  excited:
    'Expresses an upbeat and hopeful tone. It sounds like something great is happening and the speaker is really happy about that.',
  fearful:
    'Expresses a scared and nervous tone, with higher pitch, higher vocal energy, and faster rate. The speaker is in a state of tension and unease.',
  friendly:
    'Expresses a pleasant, inviting, and warm tone. It sounds sincere and caring.',
  gentle:
    'Expresses a mild, polite, and pleasant tone, with lower pitch and vocal energy.',
  hopeful:
    'Expresses a warm and yearning tone. It sounds like something good will happen to the speaker.',
  lyrical: 'Expresses emotions in a melodic and sentimental way.',
  'narration-professional':
    'Expresses a professional, objective tone for content reading.',
  'narration-relaxed':
    'Express a soothing and melodious tone for content reading.',
  newscast: 'Expresses a formal and professional tone for narrating news.',
  'newscast-casual':
    'Expresses a versatile and casual tone for general news delivery.',
  'newscast-formal':
    'Expresses a formal, confident, and authoritative tone for news delivery.',
  'poetry-reading':
    'Expresses an emotional and rhythmic tone while reading a poem.',
  sad: 'Expresses a sorrowful tone.',
  serious:
    'Expresses a strict and commanding tone. Speaker often sounds stiffer and much less relaxed with firm cadence.',
  shouting:
    'Speaks like from a far distant or outside and to make self be clearly heard.',
  'sports-commentary':
    'Expresses a relaxed and interesting tone for broadcasting a sports event.',
  'sports-commentary-excited':
    'Expresses an intensive and energetic tone for broadcasting exciting moments in a sports event.',
  whispering: 'Speaks very softly and make a quiet and gentle sound.',
  terrified:
    'Expresses a very scared tone, with faster pace and a shakier voice. It sounds like the speaker is in an unsteady and frantic status.',
  unfriendly: 'Expresses a cold and indifferent tone.',
};

const ssmlBase = (contents: string) => {
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
    ${contents}
</speak>`;
};

const ssmlVoice = (voiceName: string, contents: string) => {
  return `<voice name="${voiceName}">${contents}</voice>`;
};

const ssmlStyle = (styleName: string, phrase: string) => {
  // no style -> just insert the phrase without any markup
  if (styleName === 'none') {
    return phrase;
  }

  return `<mstts:express-as style="${styleName}">${phrase}</mstts:express-as>`;
};

const ssmlProsody = (
  pitch: number,
  rate: number,
  volume: number,
  contents: string
) => {
  return `<prosody pitch="${pitch}%" rate="${rate}" volume="${volume}">${contents}</prosody>`;
};

type EmojiObject = {
  category: string;
  char: string;
  fitzpatrick_scale: boolean;
  keywords: string[];
};

function replaceEmojiCodes(str: string): string {
  return str.replace(/:([^:\s]*):/g, (code: string) => {
    const emoji: EmojiObject | undefined =
      uEmojiParser.getEmojiObjectByCode(code);
    if (emoji) {
      return emoji.char;
    }

    return code;
  });
}

const XML_SPECIAL_TO_ESCAPE: { [key: string]: string } = {
  '"': '&quot;',
  "'": '&apos;',
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
};

const xmlEscape = (str: string) => {
  return str.replace(/["'&<>]/g, (c: string) => {
    return XML_SPECIAL_TO_ESCAPE[c];
  });
};

export type TTSSettings = {
  apiKey: string;
  region: string;
  skipEmotes: boolean;
};

export type TTSVoiceSettings = {
  voiceLang: string;
  voiceName: string;
  voiceStyle: string;
  // -100 -- 100 (gets added to default pitch in %)
  voicePitch: number;
  // 0-3 relative to normal rate
  voiceRate: number;
  // 0-100%
  voiceVolume: number;
};

export class AzureTTS {
  settings: TTSSettings;

  #currentlyPlaying: boolean;

  #queue: string[];

  // need to take the time into account that azure needs to process the request
  static readonly PAUSE_BETWEEN_PHRASES_MS = 100;

  constructor(ttsSettings: TTSSettings) {
    this.settings = ttsSettings;
    this.#currentlyPlaying = false;
    this.#queue = [];
  }

  private playOne() {
    const ssml = this.#queue.shift();
    if (ssml) {
      this.#currentlyPlaying = true;
      this.playPhrase(ssml);
    }
  }

  async queuePhrase(phrase: string, voiceSettings: TTSVoiceSettings) {
    // TODO process phrase into words/emotes etc. before sending it to the browser source server
    let finalPhrase = phrase;
    if (this.settings.skipEmotes) {
      const words = phrase.split(' ');
      finalPhrase = words
        .filter((word) => {
          return !(word in emoteNameToUrl);
        })
        .join(' ')
        .trim();
    }

    // skipping emotes might have reduced the phrase to length 0
    if (finalPhrase.length === 0) {
      return;
    }

    const parsedAndEscaped = xmlEscape(replaceEmojiCodes(finalPhrase));
    const ssml = ssmlBase(
      ssmlVoice(
        voiceSettings.voiceName,
        ssmlStyle(
          voiceSettings.voiceStyle,
          ssmlProsody(
            voiceSettings.voicePitch,
            voiceSettings.voiceRate,
            voiceSettings.voiceVolume,
            parsedAndEscaped
          )
        )
      )
    );

    const wasEmpty = this.#queue.length === 0;
    this.#queue.push(ssml);
    // NOTE: when an audio ends it automatically tries to play the next one
    // so we only need to manually play one here if the queue is empty
    // and we're not playing audios currently
    if (wasEmpty && !this.#currentlyPlaying) this.playOne();
  }

  private async playPhrase(ssml: string) {
    // TODO check we have all neccessary settings
    const speechConfig = SpeechConfig.fromSubscription(
      this.settings.apiKey,
      this.settings.region
    );

    const player = new SpeakerAudioDestination();
    player.onAudioEnd = () => {
      if (this.#queue.length > 0) {
        // NOTE: keep currentlyPlaying active so we can't play another phrase during the pause
        // play next after a pause
        setTimeout(() => {
          this.playOne();
        }, AzureTTS.PAUSE_BETWEEN_PHRASES_MS);
      } else {
        this.#currentlyPlaying = false;
      }
    };

    const audioConfig = AudioConfig.fromSpeakerOutput(player);

    const synthesizer = new SpeechSynthesizer(speechConfig, audioConfig);
    synthesizer.speakSsmlAsync(
      ssml,
      (result) => {
        if (result.errorDetails) {
          console.error(result.errorDetails);
        }

        synthesizer.close();

        // returned ArrayBuffer might be of length 0, which will result in audioEnd event not being fired
        // since there is no audio being played
        const { audioData } = result;
        if (!audioData || audioData.byteLength === 0) {
          this.#currentlyPlaying = false;
        }

        return audioData;
      },
      (error) => {
        console.log(error);
        synthesizer.close();
      }
    );
  }
}
