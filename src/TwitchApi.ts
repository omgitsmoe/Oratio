import https from 'https';

export interface User {
  id: number;
  login: string;
  display_name: string;
  type: string;
  broadcaster_type: string;
  description: string;
  profile_image_url: string;
  offline_image_url: string;
  view_count: number;
  email?: string;
  created_at: string;
}

// twitch emoticon url format:
// https://static-cdn.jtvnw.net/emoticons/v2/<id>/<format>/<theme_mode>/<scale>
// scale: 1.0 (small), 2.0 (medium), 3.0 (large)
// theme_mode: light, dark
// format: static, animated
export interface TwitchEmote {
  id: string;
  name: string;
  images: { url_1x: string; url_2x: string; url_3x: string };
  format: string[];
  scale: string[];
  theme_mode: string[];
}

// does not include an url, the format is:
// https://cdn.betterttv.net/emote/${id}/${version}
// size range: 1-3
export interface BTTVEmote {
  id: string;
  code: string;
  imageType: string;
  userId: string;
}

export interface FFZEmote {
  id: number;
  name: string;
  height: number;
  width: number;
  public: boolean;
  hidden: boolean;
  modifier: boolean;
  offset: number | null;
  margins: number | null;
  css: string | null;
  owner: unknown;
  urls: { 1: string; 2?: string; 4?: string };
  status: number;
  usage_count: number;
  created_at: string;
  last_updated: string;
}

export interface FFZEmoteSet {
  id: number;
  _type: string | null;
  title: string;
  css: string | null;
  emoticons: FFZEmote[];
}

export interface SevenTVEmoteFileInfo {
  name: string;
  static_name: string;
  width: number;
  height: number;
  frame_count: number;
  size: number;
  format: string;
}

export interface SevenTVEmote {
  id: string;
  name: string;
  flags: number;
  tags: string[];
  lifecycle: number;
  // LISTED, etc.
  state: string[];
  listed: boolean;
  animated: boolean;
  owner: unknown;
  host: {
    url: string;
    files: SevenTVEmoteFileInfo[];
  };
  versions: unknown;
}

// returned when not querying for an emote direcly
// e.g. when embedded in emote-sets/.. or in users/twitch/..
export interface SevenTVEmoteWrapped {
  id: string;
  name: string;
  flags: number;
  timestamp: number;
  actor_id: null | number;
  data: SevenTVEmote;
}

export interface Emote {
  id: string;
  name: string;
  url: string;
}

export interface EmoteGroupsGlobal {
  twitchGlobal: Emote[];
  bttvGlobal: Emote[];
  ffzGlobal: Emote[];
  sevenTVGlobal: Emote[];
}

export interface EmoteGroupsChannel {
  twitchChannel: Emote[];
  bttvChannel: Emote[];
  ffzChannel: Emote[];
  sevenTVChannel: Emote[];
}

export default class TwitchApi {
  readonly baseURI: string = 'https://api.twitch.tv/helix';

  readonly baseURIBTTV: string = 'https://api.betterttv.net/3';

  readonly baseURIFFZ: string = 'https://api.frankerfacez.com/v1';

  readonly baseURI7TV: string = 'https://7tv.io/v3';

  readonly tokenType: string = 'Bearer';

  #authHeaders: { Authorization: string; 'Client-Id': string };

  constructor(
    public twitchClientId: string,
    public authToken: string,
    // callback for when we get a 401: Unauthorized response
    public authFailedCallback: () => void
  ) {
    this.twitchClientId = twitchClientId;
    this.authToken = authToken;
    this.authFailedCallback = authFailedCallback;
    this.#authHeaders = {
      Authorization: `${this.tokenType} ${authToken}`,
      'Client-Id': twitchClientId,
    };
  }

  async apiRequest(url: string | URL, twitch: boolean): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const options: https.RequestOptions = {};
      // only need the default headers twich api calls
      if (twitch) {
        options.headers = this.#authHeaders;
      }

      const req = https.request(url.toString(), options, (res) => {
        const data: Uint8Array[] = [];

        // push chunk into data array when we receive it
        res.on('data', (chunk) => {
          data.push(chunk);
        });

        res.on('end', () => {
          // sending data finished
          const result = JSON.parse(Buffer.concat(data).toString());
          this.checkStatus(result);
          resolve(result);
        });

        res.on('error', (error) => {
          reject(error);
        });
      });
      req.end();
    });
  }

  checkStatus(data: { [key: string]: unknown }) {
    if (data.status === 401 || data.status === '401') {
      this.authFailedCallback();
    }
  }

  async getUsersByLogin(logins: [string]): Promise<User[]> {
    const url = new URL(`${this.baseURI}/users`);
    for (const login of logins) {
      url.searchParams.append('login', login);
    }

    const users = (await this.apiRequest(url, true)) as {
      data?: User[];
    };
    if (users.data) {
      return users.data;
    }
    return [];
  }

  async getUserId(login: string): Promise<number | null> {
    const users = await this.getUsersByLogin([login]);
    if (users.length > 0) {
      return users[0].id;
    }
    return null;
  }

  async getGlobalEmotesTwitch(): Promise<TwitchEmote[]> {
    const url = `${this.baseURI}/chat/emotes/global`;
    const resp = (await this.apiRequest(url, true)) as { data?: TwitchEmote[] };
    if (resp.data) {
      return resp.data;
    }
    return [];
  }

  async getChannelEmotesTwitch(user_id: number): Promise<TwitchEmote[]> {
    const url = `${this.baseURI}/chat/emotes?broadcaster_id=${user_id}`;
    const resp = (await this.apiRequest(url, true)) as { data?: TwitchEmote[] };
    if (resp.data) {
      return resp.data;
    }
    return [];
  }

  async getGlobalEmotesBTTV(): Promise<BTTVEmote[]> {
    const url = `${this.baseURIBTTV}/cached/emotes/global`;
    const resp = (await this.apiRequest(url, false)) as BTTVEmote[];
    if (resp) {
      return resp;
    }
    return [];
  }

  async getChannelEmotesBTTV(user_id: number): Promise<BTTVEmote[]> {
    const url = `${this.baseURIBTTV}/cached/users/twitch/${user_id}`;
    const resp = (await this.apiRequest(url, false)) as {
      channelEmotes?: BTTVEmote[];
      sharedEmotes: BTTVEmote[];
    };
    // user might not exist on bttv
    if (resp && resp.channelEmotes) {
      const emotes: BTTVEmote[] = [...resp.channelEmotes, ...resp.sharedEmotes];
      return emotes;
    }
    return [];
  }

  async getGlobalEmotesFFZ(): Promise<FFZEmote[]> {
    const url = `${this.baseURIFFZ}/set/global`;
    const resp = (await this.apiRequest(url, false)) as {
      sets?: { [setId: string]: FFZEmoteSet };
    };
    if (resp.sets) {
      // collect all the emotes of all the sets
      let emotes: FFZEmote[] = [];
      for (const [, set] of Object.entries(resp.sets)) {
        emotes = emotes.concat(set.emoticons);
      }

      return emotes;
    }
    return [];
  }

  async getChannelEmotesFFZ(user_id: number): Promise<FFZEmote[]> {
    const url = `${this.baseURIFFZ}/room/id/${user_id}`;
    const resp = (await this.apiRequest(url, false)) as {
      sets?: { [setId: string]: FFZEmoteSet };
    };
    if (resp.sets) {
      // collect all the emotes of all the sets
      let emotes: FFZEmote[] = [];
      for (const [, set] of Object.entries(resp.sets)) {
        emotes = emotes.concat(set.emoticons);
      }

      return emotes;
    }
    return [];
  }

  unwrapEmotes(wrappedEmotes: SevenTVEmoteWrapped[]): SevenTVEmote[] {
    return wrappedEmotes.map((wrapped) => wrapped.data);
  }

  async getGlobalEmotes7TV(): Promise<SevenTVEmote[]> {
    const globalEmoteSetId = '62cdd34e72a832540de95857';
    const url = `${this.baseURI7TV}/emote-sets/${globalEmoteSetId}`;
    const resp = (await this.apiRequest(url, false)) as
      | { emotes: SevenTVEmoteWrapped[] }
      | undefined;
    if (resp && resp.emotes) {
      return this.unwrapEmotes(resp.emotes);
    }
    return [];
  }

  async getChannelEmotes7TV(user_id: number): Promise<SevenTVEmote[]> {
    const urlUserByTwitchId = `${this.baseURI7TV}/users/twitch/${user_id}`;
    const resp = (await this.apiRequest(urlUserByTwitchId, false)) as
      // will return 'status', 'error' (and '*_code' for both of them) on error
      { error?: string; emote_set?: { emotes: SevenTVEmoteWrapped[] } };

    if (resp) {
      if (resp.error) {
        return [];
      } else if (resp.emote_set) {
        return this.unwrapEmotes(resp.emote_set.emotes);
      }
    }

    return [];
  }

  // NOTE: currently we just choose the largest __available__ size
  // we could also choose the same size every time 3x/3.0/4x..
  // since the api just returns the upscaled image
  // TODO ^
  static bttvEmoteToURL(emote: BTTVEmote): string {
    // alwasy get biggest version (3x)
    return `https://cdn.betterttv.net/emote/${emote.id}/3x`;
  }

  static convertTwitchEmote(emote: TwitchEmote): Emote {
    // https://static-cdn.jtvnw.net/emoticons/v2/<id>/<format>/<theme_mode>/<scale>
    // scale: 1.0 (small), 2.0 (medium), 3.0 (large)
    // theme_mode: light, dark
    // format: static, animated
    // alway choose biggest scale
    // prefer dark themed
    const themeMode = 'dark';
    // assuming format.length > 1 means there is an animated version
    const url = `https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/\
${emote.format.length > 1 ? 'animated' : 'static'}/\
${themeMode}/${emote.scale[emote.scale.length - 1]}`;

    return { id: emote.id, name: emote.name, url };
  }

  static convertBTTVEmote(emote: BTTVEmote): Emote {
    return {
      id: emote.id,
      name: emote.code,
      url: TwitchApi.bttvEmoteToURL(emote),
    };
  }

  static convertFFZEmote(emote: FFZEmote): Emote {
    // prioritize by size
    let url = emote.urls['4'] || emote.urls['2'] || emote.urls['1'];
    // url is missing the protocol part
    // NOTE: FFZ suddenly started including the protocol in the emote url
    if (!url.startsWith('http')) {
      url = `https:${url}`;
    }

    return { id: emote.id.toString(), name: emote.name, url };
  }

  static convert7TVEmote(emote: SevenTVEmote): Emote {
    const baseUrl = `https:${emote.host.url}`;
    // assuming the files are ordered asc by size, so choose last one
    const maxSizeEmoteFileName =
      emote.host.files[emote.host.files.length - 1].name;
    const url = `${baseUrl}/${maxSizeEmoteFileName}`;
    return { id: emote.id, name: emote.name, url };
  }

  async getGlobalEmotes(): Promise<[EmoteGroupsGlobal, string[]]> {
    const allEmotes: EmoteGroupsGlobal = {
      twitchGlobal: [],
      bttvGlobal: [],
      ffzGlobal: [],
      sevenTVGlobal: [],
    };
    const errors: string[] = [];
    // get global emotes, convert them to our common emote
    try {
      allEmotes.twitchGlobal = (await this.getGlobalEmotesTwitch()).map(
        TwitchApi.convertTwitchEmote
      );
    } catch (e) {
      errors.push(e.toString());
    }
    try {
      allEmotes.bttvGlobal = (await this.getGlobalEmotesBTTV()).map(
        TwitchApi.convertBTTVEmote
      );
    } catch (e) {
      errors.push(e.toString());
    }
    try {
      allEmotes.ffzGlobal = (await this.getGlobalEmotesFFZ()).map(
        TwitchApi.convertFFZEmote
      );
    } catch (e) {
      errors.push(e.toString());
    }
    try {
      allEmotes.sevenTVGlobal = (await this.getGlobalEmotes7TV()).map(
        TwitchApi.convert7TVEmote
      );
    } catch (e) {
      errors.push(e.toString());
    }

    return [allEmotes, errors];
  }

  async getChannelEmotes(user_id: number): Promise<[EmoteGroupsChannel, string[]]> {
    const allEmotes: EmoteGroupsChannel = {
      twitchChannel: [],
      bttvChannel: [],
      ffzChannel: [],
      sevenTVChannel: [],
    };
    const errors: string[] = [];
    try {
      allEmotes.twitchChannel = (
        await this.getChannelEmotesTwitch(user_id)
      ).map(TwitchApi.convertTwitchEmote);
    } catch (e) {
      errors.push(e.toString());
    }
    try {
      allEmotes.bttvChannel = (await this.getChannelEmotesBTTV(user_id)).map(
        TwitchApi.convertBTTVEmote
      );
    } catch (e) {
      errors.push(e.toString());
    }
    try {
      allEmotes.ffzChannel = (await this.getChannelEmotesFFZ(user_id)).map(
        TwitchApi.convertFFZEmote
      );
    } catch (e) {
      errors.push(e.toString());
    }
    try {
      allEmotes.sevenTVChannel = (await this.getChannelEmotes7TV(user_id)).map(
        TwitchApi.convert7TVEmote
      );
    } catch (e) {
      errors.push(e.toString());
    }

    return [allEmotes, errors];
  }

  async getTwitchChannelEmotesConverted(
    user_id: number
  ): Promise<{ twitchChannel: Emote[] }> {
    return {
      twitchChannel: (await this.getChannelEmotesTwitch(user_id)).map(
        TwitchApi.convertTwitchEmote
      ),
    };
  }
}
