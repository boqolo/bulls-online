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

function serverUpdate(state) {
    appState = state;
    if (appStateCallback) {
        appStateCallback(appState);
    }
}

/**
* This sets the app state callbacks up with socket events.
* This will be called by the app when it loads.
*/
export function ch_join(setState) {
    appStateCallback = setState;
    if (appState) {
        appStateCallback(appState);
    }
}

// Now that you are connected, you can join channels with a topic:
// let channel = socket.channel("topic:subtopic", {})
let channel = socket.channel("game:1", {});
channel.join()
    .receive("ok", serverUpdate)
    .receive("error", resp => { console.log("Unable to join channel", resp); });

export function ch_guess(guess) {
    channel.push("guess", guess).receive("ok", serverUpdate).receive("error", resp => console.log(resp));
}

export function ch_validate(inputValue) {
    channel.push("validate", inputValue).receive("ok", serverUpdate).receive("error", resp => console.log(resp));
}

export function ch_reset() {
    channel.push("reset", {}).receive("ok", serverUpdate).receive("error", resp => console.log(resp));
}
