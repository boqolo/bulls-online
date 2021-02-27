// NOTE: The contents of this file will only be executed if
// you uncomment its entry in "assets/js/app.js".

// To use Phoenix channels, the first step is to import Socket,
// and connect at the socket path in "lib/web/endpoint.ex".
//
// Pass the token on params as below. Or remove it
// from the params if you are not using authentication.
import {Socket} from "phoenix";

// NOTE: The below is adapted from Nat Tuck's example code during class.

let appStateCallback, appState = null;

// INIT SOCKET CONNECTION
let socket = new Socket("/socket", {params: {token: window.userToken}});
socket.onError(() => console.log("There was a websocket error."));
socket.onClose(() => console.log("Websocket closed."));

// Finally, connect to the socket:
socket.connect();

const counter = (function () {
  let c = 0;
  return function () {c += 1; return c}
}) ();

function serverUpdate(state) {
  // console.log("Received server update", counter(), state);
  appState = state;
  if (appStateCallback) {
    appStateCallback(appState);
  }
}

/**
 * This sets the app state callbacks up with socket events.
 * This will be called by the app when it loads.
 */
export function ch_init(setState) {
  appStateCallback = setState;
  if (appState) {
    appStateCallback(appState);
  }
}

let channel;
export function ch_join(names) {
  const {gameName, playerName} = names;
  channel = socket.channel("game:".concat(gameName), {});
  channel.join()
    .receive("ok", () => {
      ch_register(names)
      // Trigger presentation callback on server events (broadcasts)
      channel.on("present", serverUpdate);
    })
    .receive("error", resp => { console.log("Unable to join channel", resp); });
}

function ch_register(names) {
  channel.push("register", names)
  // .receive("ok", serverUpdate)
    .receive("error", resp => {
      serverUpdate(resp);
      channel.leave().receive("ok", (resp) => {});
      channel = null;
    });
}

// Now that you are connected, you can join channels with a topic:
// let channel = socket.channel("topic:subtopic", {})
let channel0 = socket.channel("init", {});

channel0.join()
  .receive("ok", serverUpdate)
  .receive("error", resp => { console.log("Unable to join channel", resp); });

export function ch_leave() {
  channel.push("leave", {})
    .receive("ok", resp => {
      serverUpdate(resp);
      channel.leave().receive("ok", (resp) => {});
      channel = null;
    })
    .receive("error", resp => console.log(resp));
}

export function ch_toggle_ready() {
  channel.push("toggle_ready", {}).receive("ok", serverUpdate).receive("error", resp => console.log(resp));
}

export function ch_toggle_observer() {
  channel.push("toggle_observer", {}).receive("ok", serverUpdate).receive("error", resp => console.log(resp));
}

export function ch_guess(guess) {
  channel.push("guess", guess).receive("ok", serverUpdate).receive("error", resp => console.log(resp));
}

export function ch_skip_guess() {
  channel.push("skip_guess", {}).receive("ok", serverUpdate).receive("error", resp => console.log(resp));
}

export function ch_validate(inputValue) {
  channel.push("validate", inputValue).receive("ok", serverUpdate).receive("error", resp => console.log(resp));
}

export function ch_reset() {
  channel.push("reset", {}).receive("ok", serverUpdate).receive("error", resp => console.log(resp));
}
