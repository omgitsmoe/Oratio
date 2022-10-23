import Pubnub from 'pubnub';
import PubNub from 'pubnub';

export default class PubNubChat {
  #pubnub: PubNub;

  #userId: string;

  // subscribed channels
  #channels: string[];

  #broadcastChannel: string | null;

  constructor(
    publishKey: string,
    subscribeKey: string,
    userId: string,
    broadcastChannel: string | null
  ) {
    this.#pubnub = new PubNub({
      publishKey,
      subscribeKey,
      userId,
    });

    this.#userId = userId;
    this.#channels = [];
    this.#broadcastChannel = broadcastChannel;
    this.#pubnub.addListener({ message: this.onMessage });
  }

  onMessage(message: Pubnub.MessageEvent) {
    console.log(
      `msg ${message.message} by ${message.publisher} in channel ${message.channel}`
    );
  }

  public get userId(): string {
    return this.#userId;
  }

  public static generateUserId(): string {
    // randomly generated, 36 character long v4 UUID
    return crypto.randomUUID();
  }

  public subscribe(channels: string[]) {
    // TODO prefer override?
    this.#channels.concat(
      ...channels.filter(
        (v: string) => this.#channels.findIndex((x) => x === v) !== -1
      )
    );
    this.#pubnub.subscribe({ channels });
  }

  public async post(message: string) {
    if (!this.#broadcastChannel) return;

    try {
      this.#pubnub.publish({ message, channel: this.#broadcastChannel });
    } catch (err) {
      console.log('pubnub publish err: ', err);
    }
  }
}
