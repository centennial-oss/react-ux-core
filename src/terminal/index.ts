// Public API for @centennial-oss/react-ux-core/terminal: an xterm.js terminal themed from the CCUX tokens. Apps import
// xterm's stylesheet, `@xterm/xterm/css/xterm.css`.
export {
  Terminal,
  type TerminalConnection,
  type TerminalConnectionStatus,
  type TerminalHandle,
  type TerminalProps,
} from './Terminal';
export { defaultTerminalMessages, type TerminalMessages } from './messages';
export { ansiTokens as terminalAnsiTokens } from './theme';
