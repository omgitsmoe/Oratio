![banner](./assets/OratioBanner.png)

# Project Oratio

Project Oratio aims to aid speech-impaired streamers with tools to create
a unique and engaging viewer experience.
Among others it features an on-screen display and provides support for using
Azure's lifelike text-to-speech voices.

## Installation

Download the latest stable release from the github releases
[page](https://github.com/omgitsmoe/Oratio/releases) and start
the Oratio setup.
Since we currently don't sign the release executable, there might appear a prompt
about Oratio being an unrecognized app. If you choose to trust us,
you can click `More information` and `Run anyway`.
You will then be able to launch the program from the start menu
and/or from the desktop shortcut.

The on-screen display is usable right away and can be added to OBS using
the browser source running at `http://localhost:4563`.
To avoid issues, esp. when updating, it can be helpful to activate the option
`Refresh browser when scene becomes active`.
Alternatively Oratio can be added using a capture of the window that can be
opened by clicking `Open OBS Display` with a blue chroma key filter.

![Oratio after first start](https://user-images.githubusercontent.com/60219950/197669598-38a1e401-97f5-4cb0-a62a-7c11c60a0309.png)

### Customization

The appearance of the on-screen display (text size, appearance speed, color, etc.) can be
customized in Oratio's preferences page.
Additionally a "typewriter sound" can be chosen, which will be played with each character
that gets displayed on screen.
Custom sounds can be placed in the sound folder in
`%USERPROFILE%\AppData\Local\Programs\oratio-electron\resources\assets`.

![customization options](https://user-images.githubusercontent.com/60219950/197669696-25012de0-130b-4553-b23d-592e00275ec9.png)

### Twitch chat support

Since the on-screen display only shows your messages for a limited amount of time
Oratio provides the possiblity to mirror all your messages to Twitch chat.
Additionally chat messages that you sent can be shown in Oratio over the on-screen display
(e.g. if you're using a chat app in VRChat and can't access Oratio conveniently).

In order to grant Oratio the necessary permissions (which are also needed for downloading
Twitch emotes), you need to go into the Preferences and type in your channel name
and then hit `Authorize!`.
The first time you do this it will show the exact permissions that Oratio is requesting,
which should only include the ability to read chat messages and send chat messages on
your request.
Once successful the boxes below can be checked to mirror messages from or to chat.

### Emote support

Oratio supports displaying Twitch/BTTV/FFZ/7TV emotes as well as emojis (e.g. `:smile:`).
To download these emotes, you first need to authorize Oratio with Twitch
(see [above](#Twitch-chat-support)).

Then you can go to `Preferences` -> `Manage emotes`.
Importing global emotes can be started using the `Refresh Global Emotes!` button.
`Refresh Your Channel Emotes!` will download all your channel emotes including BTTV/FFZ/7TV.
Additionally you can type any valid channel name below that and download their channel emotes
(just Twitch) to use them in Oratio.

![manage emotes](https://user-images.githubusercontent.com/60219950/197672122-85f4e513-90bd-4f1d-bb17-37a885008360.png)

When typing in the text field you can use the `Tab` key to autocomplete emote names.

### Text-to-Speech support

Streams are often consumed without paying full attention, which makes it hard to
read an on-screen display.
Thus Oratio supports using Azure's neural voices to further enhance your stream experience.

In order to be able to use Oratio's TTS, you need to create an [Azure account](https://azure.microsoft.com/free/).
Afterwards you need to create a speech resource:

1. Head to https://portal.azure.com/#home
2. Hit `Create a resource` and then search for `Speech` (not Speech to text)
3. Select `Create`
4. You need to create a new Resource group (assuming it's your first resource) and then select it
5. Select the region that is closes to you or that provides better [pricing](https://go.microsoft.com/fwlink/?linkid=2100053)
6. Type in a name for the speech resource
7. For the pricing tier there are two options:
   - Free: Azure provides a free plan, which allows you to use 500,000 synthesized characters per month,
     but stops working after that
   - Standard: This is the pay-as-you-go alternative, where you roughly pay ~$16 per one million
     synthesized charachters (make sure to check the prices for your region though).
   
   You can also combine these two options and use the free tier until the characters run out and
   then switch to the payed tier.
8. Click `Review + create` and then `Create` again afte reviewing your submission.
9. Wait till the deployment is complete and then hit `Go to resource` or go back to
   the [home portal](https://portal.azure.com/#home) and wait till your resource shows
   up under recent resources
10. On the left, find the key symbol and click `Keys and Endpoint`

Copy both the region and one of the keys into Oratio's TTS settings
(`Preferences` -> `Text To Speech Settings`).
Afterwards you should be able to click `Update voices` and select a voice that suits you
(voices can be tested [here](https://azure.microsoft.com/products/cognitive-services/text-to-speech/#features)
quickly).

To save on synthesized characters Oratio provides the option to skip reading out emotes.
Additionally phrases can be cached, so repeating the same message will use the cached version
and not incur more costs. Settings the phrase limit to `0` deactivates the cache.
You can delete the cache (might be bigger than 10-100 MiB depending on the phrase limit and your
average message size) by navigating to `%USERPROFILE%\AppData\Local\Programs\oratio-electron\resources\assets`
and removing the `cache.json` file.

On Oratio's home screen you can then activate the TTS by clicking the `TTS active` checkbox.
More TTS settings will appear below, where you can select more advanced options:

- Voice style: Speaking style or emotion of the used voice, e.g. cheerful, angry, ...
- Under `Show more options`
  - Pitch
  - Rate: Speaking speed

**PRICING ALERT**: Using these advanced options (style, pitch and rate) will incur additional costs
or rather use up more characters. The characters needed to set these options, if they are not at
their default value (style: `none`, pitch: `0`, rate: `1`), will be billed by Azure:

- `Style`: at least 49 characters per message (using shortest voice style `sad`)
- 20 characters shared between `Pitch` and `Rate`
  - + at least 10 characters for using `Pitch`
  - + at least  8 characters for using `Rate`

The triangle symbol next to `TTS Settings` will be colored **red** should any selected
option incur additional costs (see image below).

![tts warning](https://user-images.githubusercontent.com/60219950/197678547-f49cfbcb-498f-46a5-a14f-f87a8cb1e4d6.png)

The three settings for style, pitch and rate can be saved under a configuration
by clicking the save/floppy disk symbol and supplying a name.
These can be loaded using the folder symbol and a **key binding** can be assigned to them
in the `Preferences` -> `Text To Speech Settings` menu.
You can click `Add Binding` and then press and hold (might take a bit) the binding you want
the configuration to be assigned to. Modifiers like `Shift`/`Alt` can also be used.
Make sure **not** to bind the **Return** key or **single charachters** that are used while typing.
Then you can hit `Save Binding` and assign a configutation from the drop-down.
Using the key binding on the home screen will load the selected TTS configuration.
(This can be used to e.g. quickly switch between emotions like cheerful, sad and angry.)

### Collab

To support collabs between (speech impaired) streamers, Oratio provides a way
for other Oratio users to send messages to a separate on-screen display.
These will be shown on a different browser source running at
http://localhost:4563/collab.

In order to send/receive messages you need to join the same channel on
the `Preferences` -> `Collab Settings` page and activate
the listen (needs a channel name set) and/or broadcast (needs a nickname set) checkboxes.
Since Oratio is an installed application without a master server, there
is no way to secure the channels, but another user can't find your channel
unless they make a lucky guess. Thus pick a **non-trivial channel name**
and **only share** it with **trusted** people.
Otherwise another user might be able to join your channel and send messages
to/listen to messages from your Oratio instance.

The same settings that are available for the regular on-screen display
can also be adjusted for the collab display.
There is one major difference though, the text color and speech bubble color
setting will apply to the messages that **you sent** and they will
determine how they look **on the receiving** Oratio instance.

The **browser source** URL above will show all the user messages on the same
"display" with name tags. You might want a **separate** browser source **per user**,
so that you e.g. can position them directly above a user on your stream.
Go to the `Collab Settings` page and enter the name, of the user that you want the browser 
source for, into the textfield with the label "Collab Display Nick Name" and hit `Copy!`.
Then you can paste the link into OBS as a new browser source.  
**REMEMBER: if the user changes their name, you will also have to edit the browser source!**

*NOTE: Emotes will only be shown if they're available on the receiving Oratio instance!
Otherwise they will show up as regular text.*

## Starting Development

First, clone the repo via git and install dependencies:

```bash
git clone --depth 1 --single-branch https://github.com/Y0dax/Oratio.git your-project-name
cd your-project-name
yarn
```

Start the app in the `dev` environment:

```bash
yarn start
```

## Packaging for Production

To package apps for the local platform:

```bash
yarn package
```
