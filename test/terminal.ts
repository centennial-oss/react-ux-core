// Terminal fixtures for stories and tests: xterm's stylesheet (as an app imports it), a fake echo "shell" that stands
// in for a socket, and sample output with ANSI colours.
import '@xterm/xterm/css/xterm.css';

const esc = '\x1b';

/** A coloured shell prompt. */
export const shellPrompt = `${esc}[32mada@observatory${esc}[0m:${esc}[34m~${esc}[0m$ `;

/** A greeting written when the echo shell connects. */
export const shellGreeting = `Observatory control shell. Type a command and press Enter.\r\n\r\n${shellPrompt}`;

/**
 * A fake shell behind a fake socket: echoes what's typed, handles Backspace, and answers each line with
 * `you typed: …` and a new prompt. Feed it `onData`; it writes back through `write` (the terminal handle's).
 */
export function createEchoShell(write: (data: string) => void): (data: string) => void {
  let line = '';
  return (data) => {
    for (const char of data) {
      if (char === '\r') {
        const reply = line === '' ? '' : `you typed: ${line}\r\n`;
        write(`\r\n${reply}${shellPrompt}`);
        line = '';
      } else if (char === '\x7f') {
        if (line !== '') {
          line = line.slice(0, -1);
          write('\b \b');
        }
      } else if (char >= ' ') {
        line += char;
        write(char);
      }
    }
  };
}

const names = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];

/** Every ANSI colour, normal and bright, as text. */
export const ansiSample = [
  ...names.map(
    (name, index) =>
      `${esc}[3${String(index)}m${name.padEnd(8)}${esc}[0m  ${esc}[9${String(index)}mbright ${name}${esc}[0m`,
  ),
  `${esc}[1mbold${esc}[0m  ${esc}[4munderlined${esc}[0m  ${esc}[7minverse${esc}[0m`,
].join('\r\n');

/** A telescope job's build-style log, for read-only output. */
export const jobLog = [
  `${esc}[2m09:40:01${esc}[0m ${esc}[34minfo${esc}[0m  Slewing to Jupiter (RA 02h 41m, Dec +14°)`,
  `${esc}[2m09:40:07${esc}[0m ${esc}[34minfo${esc}[0m  Tracking locked, seeing 1.2″`,
  `${esc}[2m09:40:12${esc}[0m ${esc}[33mwarn${esc}[0m  Dome humidity 78% (limit 85%)`,
  `${esc}[2m09:40:30${esc}[0m ${esc}[34minfo${esc}[0m  Exposure 1 of 3: 30 s, filter R`,
  `${esc}[2m09:41:02${esc}[0m ${esc}[34minfo${esc}[0m  Exposure 2 of 3: 30 s, filter G`,
  `${esc}[2m09:41:34${esc}[0m ${esc}[31merror${esc}[0m Guide star lost; retrying`,
  `${esc}[2m09:41:40${esc}[0m ${esc}[32mok${esc}[0m    Guide star reacquired`,
  `${esc}[2m09:41:42${esc}[0m ${esc}[34minfo${esc}[0m  Exposure 3 of 3: 30 s, filter B`,
  `${esc}[2m09:42:15${esc}[0m ${esc}[32mok${esc}[0m    Saved jupiter-rgb.fits`,
].join('\r\n');
