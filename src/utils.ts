import { UiohookKey, UiohookKeyboardEvent } from 'uiohook-napi';

const uioCodeToStr: { [key: number]: string } = {};
for (const [str, code] of Object.entries(UiohookKey)) {
  uioCodeToStr[code] = str;
}
uioCodeToStr[UiohookKey.CapsLock] = 'Capslock';
uioCodeToStr[UiohookKey.ArrowLeft] = 'Left';
uioCodeToStr[UiohookKey.ArrowUp] = 'Up';
uioCodeToStr[UiohookKey.ArrowRight] = 'Right';
uioCodeToStr[UiohookKey.ArrowDown] = 'Down';
uioCodeToStr[UiohookKey.Numpad0] = 'num0';
uioCodeToStr[UiohookKey.Numpad1] = 'num1';
uioCodeToStr[UiohookKey.Numpad2] = 'num2';
uioCodeToStr[UiohookKey.Numpad3] = 'num3';
uioCodeToStr[UiohookKey.Numpad4] = 'num4';
uioCodeToStr[UiohookKey.Numpad5] = 'num5';
uioCodeToStr[UiohookKey.Numpad6] = 'num6';
uioCodeToStr[UiohookKey.Numpad7] = 'num7';
uioCodeToStr[UiohookKey.Numpad8] = 'num8';
uioCodeToStr[UiohookKey.Numpad9] = 'num9';
uioCodeToStr[UiohookKey.NumpadMultiply] = 'nummult';
uioCodeToStr[UiohookKey.NumpadAdd] = 'numadd';
uioCodeToStr[UiohookKey.NumpadSubtract] = 'numsub';
uioCodeToStr[UiohookKey.NumpadDecimal] = 'numdec';
uioCodeToStr[UiohookKey.NumpadDivide] = 'numdiv';
uioCodeToStr[UiohookKey.NumpadEnd] = 'End';
uioCodeToStr[UiohookKey.NumpadArrowDown] = 'Down';
uioCodeToStr[UiohookKey.NumpadPageDown] = 'PageDown';
uioCodeToStr[UiohookKey.NumpadArrowLeft] = 'Left';
uioCodeToStr[UiohookKey.NumpadArrowRight] = 'Right';
uioCodeToStr[UiohookKey.NumpadHome] = 'Home';
uioCodeToStr[UiohookKey.NumpadArrowUp] = 'Up';
uioCodeToStr[UiohookKey.NumpadPageUp] = 'PageUp';
uioCodeToStr[UiohookKey.NumpadInsert] = 'Insert';
uioCodeToStr[UiohookKey.NumpadDelete] = 'Delete';
uioCodeToStr[UiohookKey.Semicolon] = ';';
uioCodeToStr[UiohookKey.Equal] = '=';
uioCodeToStr[UiohookKey.Comma] = ',';
uioCodeToStr[UiohookKey.Minus] = '-';
uioCodeToStr[UiohookKey.Period] = '.';
uioCodeToStr[UiohookKey.Slash] = '/';
uioCodeToStr[UiohookKey.Backquote] = '`';
uioCodeToStr[UiohookKey.BracketLeft] = '[';
uioCodeToStr[UiohookKey.Backslash] = '\\';
uioCodeToStr[UiohookKey.BracketRight] = ']';
uioCodeToStr[UiohookKey.Quote] = "'";
uioCodeToStr[UiohookKey.Ctrl] = 'CommandOrControl';
uioCodeToStr[UiohookKey.CtrlRight] = 'CommandOrControl';
uioCodeToStr[UiohookKey.AltRight] = 'AltGr';
uioCodeToStr[UiohookKey.ShiftRight] = 'Shift';
// or Super
uioCodeToStr[UiohookKey.MetaRight] = 'Meta';
uioCodeToStr[UiohookKey.NumLock] = 'Numlock';
uioCodeToStr[UiohookKey.ScrollLock] = 'Scrolllock';

export function uioEventToElectronKeyCode(e: UiohookKeyboardEvent): string {
  let result: string;
  if (e.keycode === 3612) {
    result = 'Return';
  } else {
    result = uioCodeToStr[e.keycode];
  }

  return result;
}

const shiftModMap: { [char: string]: string } = {
  '[': '{',
  ']': '}',
  ';': ':',
  "'": '"',
  '\\': '|',
  ',': '<',
  '.': '>',
  '/': '?',
  '`': '~',
  '1': '!',
  '2': '@',
  '3': '#',
  '4': '$',
  '5': '%',
  '6': '^',
  '7': '&',
  '8': '*',
  '9': '(',
  '0': ')',
  '-': '_',
  '=': '+',
};

for (const c of 'abcdefghijklmnopqrstuvwxyz') {
  shiftModMap[c] = c.toUpperCase();
}

// NOTE: en-US layout only
export function shiftPressed(keyCode: string): string {
  return shiftModMap[keyCode] ?? keyCode;
}
