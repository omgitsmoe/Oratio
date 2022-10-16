import {
  SpeechConfig,
  SpeechSynthesizer,
  AudioConfig,
  Connection,
} from 'microsoft-cognitiveservices-speech-sdk';
import { Howl } from 'howler';
import uEmojiParser from 'universal-emoji-parser';
import { emoteNameToUrl } from './components/Emotes';
import { TTSCache } from './TTSCache';

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

// NOTE: !IMPORTANT! Azure's billing metric is based on synthesized characters and
// while the <speak> and <voice> tags are not counted towards that metric
// any special funcionality like styles or prosody will have their ssml chars
// counted towards the billing metric!!
// -> don't include attribute if it's a default
const ssmlStyle = (styleName: string, phrase: string) => {
  // no style -> just insert the phrase without any markup
  if (styleName === 'none') {
    return phrase;
  }

  return `<mstts:express-as style="${styleName}">${phrase}</mstts:express-as>`;
};

const defaultPitch = 0;
const defaultRate = 1;
const defaultVolume = 100;
const ssmlProsody = (
  pitch: number,
  rate: number,
  volume: number,
  contents: string
) => {
  // all defaults -> no prosody tag required
  if (
    pitch === defaultPitch &&
    rate === defaultRate &&
    volume === defaultVolume
  ) {
    return contents;
  }

  const pitchAttr = pitch !== defaultPitch ? ` pitch="${pitch}%"` : '';
  const rateAttr = rate !== defaultRate ? ` rate="${rate}"` : '';
  const volumeAttr = volume !== defaultVolume ? ` volume="${volume}"` : '';
  return `<prosody${pitchAttr}${rateAttr}${volumeAttr}>${contents}</prosody>`;
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

enum QueuedAudioKind {
  Raw = 0,
  Base64,
}

type QueuedAudioRaw = {
  kind: QueuedAudioKind.Raw;
  settings: TTSVoiceSettings;
  phrase: string;
  buffer: ArrayBuffer;
}

type QueuedAudioB64 = {
  kind: QueuedAudioKind.Base64;
  settings: TTSVoiceSettings;
  phrase: string;
  base64: string;
}

type QueuedAudio =
  | QueuedAudioRaw
  | QueuedAudioB64;

export class AzureTTS {
  settings: TTSSettings;

  #cache: TTSCache<string, string>;

  #synthesizer: SpeechSynthesizer | null;

  #audioQueue: QueuedAudio[];

  #isPlaying: boolean;

  isOpen: boolean;

  // need to take the time into account that azure needs to process the request
  static readonly PAUSE_BETWEEN_PHRASES_MS = 100;

  constructor(ttsSettings: TTSSettings, cache: TTSCache<string, string>) {
    this.settings = ttsSettings;
    this.#cache = cache;

    this.#audioQueue = [];
    this.#isPlaying = false;

    this.#synthesizer = null;
    this.isOpen = false;
  }

  private preConnect() {
    if (this.#synthesizer !== null) {
      const connection = Connection.fromSynthesizer(this.#synthesizer);
      connection.openConnection();
      this.isOpen = true;
    }
  }

  public open(ttsSettings?: TTSSettings | undefined) {
    if (ttsSettings !== undefined) {
      this.settings = ttsSettings;
    }
    this.#synthesizer = this.createSynthesizer();
    this.preConnect();
  }

  private createSynthesizer(): SpeechSynthesizer | null {
    if (!this.settings.apiKey || !this.settings.region) {
      console.error('AzureTTS: missing api key or region');
      return null;
    }

    const speechConfig = SpeechConfig.fromSubscription(
      this.settings.apiKey,
      this.settings.region
    );

    // this needs to be null otherwise it will outaplay on default output
    return new SpeechSynthesizer(speechConfig, null as unknown as AudioConfig);
  }

  public close() {
    if (this.#synthesizer) {
      this.#synthesizer.close();
      this.#synthesizer = null;
    }

    this.isOpen = false;
  }

  public static buildLookupKey(phrase: string, voiceSettings: TTSVoiceSettings) {
    return `${voiceSettings.voiceName}|${voiceSettings.voiceStyle}|` +
      `p${voiceSettings.voicePitch}r${voiceSettings.voiceRate}:${phrase}`;
  }

  async queuePhrase(phrase: string, voiceSettings: TTSVoiceSettings) {
    // TODO process phrase into words/emotes etc. before sending it to the browser source server
    let finalPhrase = phrase.trim();
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

    const cached = this.#cache.get(AzureTTS.buildLookupKey(phrase, voiceSettings));
    if (cached) {
      console.log('using cached phrase');

      this.#audioQueue.push({
        kind: QueuedAudioKind.Base64,
        phrase,
        settings: voiceSettings,
        base64: cached,
      });
      if (!this.#isPlaying) this.playOne();

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

    this.synthesizeAndQueuePhrase(ssml, finalPhrase, voiceSettings);
  }

  static arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }

    return btoa(binary);
  }

  private async playOne() {
    const audioData = this.#audioQueue.shift();
    if (!audioData) {
      this.#isPlaying = false;
      return;
    }

    this.#isPlaying = true;

    let src: string | undefined;
    switch(audioData.kind) {
      case QueuedAudioKind.Raw:
        src = `data:audio/mpeg;base64,${AzureTTS.arrayBufferToBase64(audioData.buffer)}`;
        // add the phrase to the cache
        this.#cache.put(AzureTTS.buildLookupKey(audioData.phrase, audioData.settings), src);
        break;
      case QueuedAudioKind.Base64:
        src = audioData.base64;
        break;
    }

    // TODO can the default audio format (mp3) change without changing the sdk version?
    const sound = new Howl({
      src,
      autoplay: true,
      onend: () => {
        // keep isPlaying on a delay
        setTimeout(() => {
          this.playOne();
        }, AzureTTS.PAUSE_BETWEEN_PHRASES_MS);
      },
    });
  }

  private async synthesizeAndQueuePhrase(ssml: string, phrase: string, settings: TTSVoiceSettings) {
    if (!this.#synthesizer) {
      console.error(
        'AzureTTS: missing synthesizer - missing or invalid API key or region'
      );
      return;
    }

    this.#synthesizer.speakSsmlAsync(
      ssml,
      (result) => {
        if (result.errorDetails) {
          console.error(result.errorDetails);
        }

        // returned ArrayBuffer might be of length 0, which will result in audioEnd event not being fired
        // since there is no audio being played
        const { audioData } = result;
        if (audioData && audioData.byteLength !== 0) {
          this.#audioQueue.push({
            kind: QueuedAudioKind.Raw,
            phrase,
            settings,
            buffer: audioData,
          });
          if (!this.#isPlaying) this.playOne();
          return audioData;
        }

        return undefined;
      },
      (error) => {
        console.error(error);
      }
    );
  }
}
