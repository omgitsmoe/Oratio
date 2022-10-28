import Pubnub from 'pubnub';

export type PubnubChatMessageEvent = {
  message: string;
  userSettings: UserSettings;
};

export type UserSettings = {
  nickName: string;
  fontColor: string;
  bubbleColor: string;
};

export default class PubnubChat {
  #pubnub: Pubnub;

  #userId: string;

  #channel: string;

  #userSettings: UserSettings;

  // currently not needed, since we don't allow this to change
  // #listen: boolean;

  #broadcast: boolean;

  #messageCallback: ((event: PubnubChatMessageEvent) => void) | null;

  constructor(
    publishKey: string,
    subscribeKey: string,
    userId: string,
    channel: string,
    userSettings: UserSettings,
    listen: boolean,
    broadcast: boolean,
    messageCallback: ((event: PubnubChatMessageEvent) => void) | null
  ) {
    this.#pubnub = new Pubnub({
      publishKey,
      subscribeKey,
      userId,
    });

    this.#userId = userId;
    this.#channel = channel;
    this.#userSettings = userSettings;
    // this.#listen = listen;
    this.#broadcast = broadcast;
    // NOTE: we need to pass a closure here so onMessage actually gets called on the
    // object otherwise this will point to the function and not to the class instance
    this.#pubnub.addListener({ message: (m) => this.onMessage(m) });
    this.#messageCallback = messageCallback;

    if (listen) this.subscribe(channel);
  }

  public stop() {
    this.#pubnub.stop();
  }

  onMessage(message: Pubnub.MessageEvent) {
    console.log(
      `msg ${message.message} by ${message.publisher} in channel ${message.channel}`
    );
    const msg: string = message.message;
    let lastSepIdx = msg.indexOf(':');
    const nickName = msg.substring(0, lastSepIdx);
    let sepIdx = msg.indexOf(':', lastSepIdx + 1);
    const fontColor = msg.substring(lastSepIdx + 1, sepIdx);
    lastSepIdx = sepIdx;
    sepIdx = msg.indexOf(':', lastSepIdx + 1);
    const bubbleColor = msg.substring(lastSepIdx + 1, sepIdx);
    // NOTE: assuming message length is at least one (since we don't allow to send
    // 0 char messages in the main message box)
    const actualMessage = msg.substring(sepIdx + 1);
    const isSelf = message.publisher === this.#userId;
    if (!isSelf && this.#messageCallback)
      this.#messageCallback({
        message: actualMessage,
        userSettings: { nickName, fontColor, bubbleColor },
      });
  }

  public set messageCallback(
    callback: (event: PubnubChatMessageEvent) => void | null
  ) {
    this.#messageCallback = callback;
  }

  public get userId(): string {
    return this.#userId;
  }

  public static generateUserId(): string {
    // randomly generated, 36 character long v4 UUID
    return crypto.randomUUID();
  }

  subscribe(channel: string) {
    // currently not needed, since we don't allow changing channel/listen/broadcast
    console.log('subscribing', channel);
    const channels = this.#pubnub.getSubscribedChannels();
    if (channels.length >= 0 && channels.findIndex((v) => v === channel) !== -1)
      return;
    console.log('not already subscribed');

    // if the channels were the same or we'd allow multiple channels, we
    // might miss messages when unsubscribing and then re-subbing
    this.#pubnub.unsubscribeAll();
    this.#pubnub.subscribe({ channels: [channel] });
  }

  public async post(message: string) {
    if (!this.#broadcast) return;

    try {
      this.#pubnub.publish({
        message: `${this.#userSettings.nickName}:${
          this.#userSettings.fontColor
        }:${this.#userSettings.bubbleColor}:${message}`,
        channel: this.#channel,
      });
    } catch (err) {
      console.log('pubnub publish err: ', err);
    }
  }
}
