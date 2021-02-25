import React from "react";
import { ch_init, ch_join, ch_leave, ch_guess, ch_toggle_observer, ch_reset, ch_validate, ch_toggle_ready } from "./socket";

function Register({message}) {
    const [gameName, setGameName] = React.useState("");
    const [playerName, setPlayerName] = React.useState("");

    function handleKey(ev, setter) {
        const newInputValue = ev.target.value;
        setter(newInputValue);
    }

    /**
     * Allow pressing enter for guess submission.
     * @param ev Keyboard event
     */
    function pressedEnter(ev) {
        if (ev.key === "Enter" && gameName && playerName) {
            ch_join({gameName: gameName, playerName: playerName});
        }
    }

    return (
      <div>
        <div className="register-container">
          <h2>Enter a game name:</h2>
          <div className={"input-container"}>
            <input type={"text"} value={gameName} autoFocus={false}
                   onChange={ev => handleKey(ev, setGameName)}></input>
            <h2>Enter your name:</h2>
            <input type={"text"} value={playerName} autoFocus={false}
                   onChange={ev => handleKey(ev, setPlayerName)} onKeyPress={pressedEnter}>
            </input>
          </div>
          <div className={"buttons-container"}>
            <button className={"pure-button pure-button-primary"}
                    disabled={!(gameName && playerName)}
                    onClick={() => ch_join({gameName: gameName, playerName: playerName})}>Submit
            </button>
          </div>
        </div>
        {message && <div className={"register-message"}>{message}</div>}
      </div>
    );
}

function GuessControls({
    inputValue,
    inputHandler,
    submitHandler,
    canSubmit
}) {

    /**
     * Push input changes server-side for validation.
     * @param ev Keyboard event
     */
    function setTextInput(ev) {
        const newInputValue = ev.target.value;
        // send what the updated input would look like. server
        // will either accept or reject changes.
        inputHandler(newInputValue);
    }

    /**
     * Allow pressing enter for guess submission.
     * @param ev Keyboard event
     */
    function pressedEnter(ev) {
        if (ev.key === "Enter" && canSubmit) {
            submitHandler(inputValue);
        }
    }

    return (
        <div className={"input-container"} role={"group"}>
          <input className={"guess-field"} type={"text"} value={inputValue}
                 onKeyPress={pressedEnter}
                 autoFocus={false}
                 onChange={setTextInput}/>
          <div className={"buttons-container"}>
            <button className={"pure-button"}
                    onClick={() => inputHandler("")}>Clear
            </button>
            <button className={"pure-button pure-button-primary"}
                    disabled={!canSubmit}
                    onClick={() => submitHandler(inputValue)}>Submit
            </button>
          </div>
        </div>
    );
}

function PlayerHistory({player, guessHistory}) {

  return (
    <>
    {Object.keys(guessHistory).map(n =>
      <div key={`${player}-g-${n}`} className={"guess-item"}>
        <div className={"pure-g"}>
          <div className={"pure-u-1-5"}>
            {player}
          </div>
          <div className={"pure-u-1-5"}>
            G #
          </div>
          <div className={"pure-u-1-5"}>
            Guess
          </div>
          <div className={"pure-u-1-5"}>
            Bulls
          </div>
          <div className={"pure-u-1-5"}>
            Cows
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function History({history}) {

    return (
        <div className={"guesses-container"}>
          <label className={"guess-list-label"}>Guesses:</label>
          <div className={"guess-list"}>
            {Object.keys(history).map(player =>
              <PlayerHistory key={player} player={player} guessHistory={history[player]} />
            )}
          </div>
        </div>
    );

}

function GameOver({restartGame}) {
    return <>
             <h1 className={"game-over-header"}>Game Over</h1>
             <h3>You ran out of guesses.</h3>
             <p>Better luck next time...</p>
             <button className={"pure-button pure-button-primary"}
                     onClick={restartGame}>Restart
             </button>
           </>;
}

function Lobby({
  playerName,
  gameName, 
  players,
  message
}) {

  // players is {playerName (string): ["player" | "observer", "ready" | "unready"]
  const playerNames = Object.keys(players);
  const readyPlayers = playerNames.filter(name => 
    players[name][1] === "ready");
  const playerReady = players[playerName][1] === "ready";
  const isObserver = players[playerName][0] === "observer";
  // TODO toggle observer, back button, 

  return (
    <div className={"lobby"}>
      <div className={"status-bar"}>
        <div>
          {`${gameName} - Lobby `}
        </div>
        <div>
          {`${playerNames.length} players | ${readyPlayers.length} ready`}
        </div>
        {message && <div className="lobby-message">{message}</div>}
      </div>
      <div className={"pure-g"}>
        <div className={"pure-u-2-3"}>
          {playerNames.map(name => 
            <div key={name} className={"lobby-player"}>
              <div className={!readyPlayers.includes(name) ? "unready-player" : ""}>
                {name}
              </div>
            </div>
          )}
        </div>
        <div className={"pure-u-1-3"}>
          <div>
            {playerReady ? 
              <button className={"pure-button unready-button"}
                      onClick={() => ch_toggle_ready(playerName)}>
                Unready
              </button>
              : <button className={"pure-button pure-button-primary ready-button"}
                        onClick={() => ch_toggle_ready(playerName)}>
                  Ready
                </button>}
          </div>
          <div>
            {isObserver ? 
              <button className={"pure-button toggle-player-button"}
                      onClick={() => ch_toggle_observer(playerName)}>
                Become Player
              </button>
              : <button className={"pure-button toggle-observer-button"}
                        onClick={() => ch_toggle_observer(playerName)}>
                  Become Observer
                </button>}
          </div>
          <div>
            <button className={"pure-button leave-button"}
                    onClick={() => ch_leave(playerName)}>
              Leave game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Game({state}) {

  const {
    playerName,
    gameName,
    gamePhase,
    inputValue, 
    history, 
    players,
    gameWon, 
    message
  } = state;
  
  const MAX_DIGITS = 4;

  let body;

  if (gameWon) {
      body = <GameOver restartGame={restartGame}/>;
  } else if (gamePhase == "lobby") {
      body = <Lobby playerName={playerName} gameName={gameName} players={players} message={message}/>    
  } else if (gamePhase == "endgame") {
      // TODO maybe not needed
  } else { // gamePhase === "playing"
        const canSubmit = inputValue.length === MAX_DIGITS;
        body = <>
          {gameWon && <>
            <h1 className={"game-won-header"}>You won!</h1>
            <p>The digits were {inputValue}.</p>
            <button className={"pure-button pure-button-primary"}
              onClick={restartGame}>Restart
            </button>
            </>}
          {!gameWon && <>
            <GuessControls inputValue={inputValue}
                          inputHandler={pressKey}
                          submitHandler={submitGuess}
                          canSubmit={canSubmit}/>
            <div className={"button-main-restart-container"}>
            <button className={"pure-button button-main-restart"}
              onClick={restartGame}>Restart
            </button>
            </div>
            {message && <div className="alert-warning">{message}</div>}
            </>}
          <History history={history}/>
        </>;
    }

  return (
    <>
      {body}
    </>
  );

}

// Main Game Component
export default function FourDigits() {

    // 4-tuple of digits 0-9
    const [state, setState] = React.useState({
        playerName: "",
        gameName: "",
        gamePhase: "",
        inputValue: "",
        history: {},
        players: {},
        gameWon: false,
        message: ""
    });

    const {playerName, message} = state;

    /**
     * Set channel callback.
     */
    React.useEffect(function() {
        ch_init(setState);
    }, []);

    function pressKey(inputValue) {
        ch_validate(inputValue);
    }

    function restartGame() {
        ch_reset();
    }

    function submitGuess(guess) {
        ch_guess(guess);
    }

    /**
     * Conditionally select body.
     */
    let body;

    if (!playerName) {
        body = <Register message={message} />;
    } else {
        body = <Game state={state} />
    }


    return (
      <>
        <div className={"header"}>
          <div className={"logo"}>
            <h1 className={"game-title-header"}>4Digits</h1>
            <h3>Online</h3>
          </div>
        </div>
        <div>
          {body}
        </div>
      </>
    );

}
