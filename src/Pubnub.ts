import Pubnub from 'pubnub';

export type PubnubChatMessageEvent = Pubnub.MessageEvent;

export default class PubnubChat {
  #pubnub: Pubnub;

  #userId: string;

  #channel: string;

  // currently not needed, since we don't allow this to change
  // #listen: boolean;

  #broadcast: boolean;

  #messageCallback: ((event: Pubnub.MessageEvent) => void) | null;

  constructor(
    publishKey: string,
    subscribeKey: string,
    userId: string,
    channel: string,
    listen: boolean,
    broadcast: boolean,
    messageCallback: ((event: Pubnub.MessageEvent) => void) | null
  ) {
    this.#pubnub = new Pubnub({
      publishKey,
      subscribeKey,
      userId,
    });

    this.#userId = userId;
    this.#channel = channel;
    // this.#listen = listen;
    this.#broadcast = broadcast;
    // NOTE: we need to pass a closure here so onMessage actually gets called on the
    // object otherwise this will point to the function and not to the class instance
    this.#pubnub.addListener({ message: (m) => this.onMessage(m) });
    this.#messageCallback = messageCallback;

    if (listen) this.subscribe(channel);
  }

  onMessage(message: Pubnub.MessageEvent) {
    console.log(
      `msg ${message.message} by ${message.publisher} in channel ${message.channel}`
    );
    console.log('msg callback', this.#messageCallback);
    if (this.#messageCallback) this.#messageCallback(message);
  }

  public set messageCallback(
    callback: (event: Pubnub.MessageEvent) => void | null
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
      this.#pubnub.publish({ message, channel: this.#channel });
    } catch (err) {
      console.log('pubnub publish err: ', err);
    }
  }
}
