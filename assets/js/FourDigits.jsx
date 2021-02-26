import React from "react";
import { ch_init, ch_join, ch_leave, ch_guess, ch_toggle_observer, ch_reset, ch_validate, ch_toggle_ready } from "./socket";

function Register({message}) {
  const [gameName, setGameName] = React.useState("");
  const [playerName, setPlayerName] = React.useState("");

  function handleJoin(gname, pname) {
    ch_join({gameName: gname, playerName: pname});
  }

  function handleKey(ev, setter) {
    const newInputValue = ev.target.value;
    setter(newInputValue);
  }

  /**
   * Allow pressing enter for guess submission.
   * @param ev Keyboard event
   */
  function pressedEnter(ev, gname, pname) {
    if (ev.key === "Enter" && gname && pname) {
      handleJoin(gname, pname);
    }
  }

  return (
    <div>
      <h1>Start or Join a game!</h1>
      <div className="register-container">
        <h2>Enter a game name</h2>
        <input type={"text"} value={gameName} autoFocus={false}
               onChange={ev => handleKey(ev, setGameName)}></input>
        <h2>What is your name?</h2>
        <input type={"text"} value={playerName} autoFocus={false}
              onChange={ev => handleKey(ev, setPlayerName)}
              onKeyPress={ev => pressedEnter(ev, gameName, playerName)}>
        </input>
        <div className={"buttons-container"}>
          <button className={"pure-button pure-button-primary"}
                  disabled={!(gameName && playerName)}
                  onClick={() => handleJoin(gameName, playerName)}>
            Start
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
    // // TODO ch_validate
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
              {`#${parseInt(n) + 1}`}
            </div>
            <div className={"pure-u-1-5"}>
              {guessHistory[n][0]}
            </div>
            <div className={"pure-u-1-5"}>
              B: {guessHistory[n][1]}
            </div>
            <div className={"pure-u-1-5"}>
              C: {guessHistory[n][2]}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function History({guesses}) {

  return (
    <div className={"guesses-container"}>
      <label className={"guess-list-label"}>Guesses:</label>
      <div className={"guess-list"}>
        {Object.keys(guesses).map(player =>
          <PlayerHistory key={player} player={player} guessHistory={guesses[player]} />
        )}
      </div>
    </div>
  );
}

function GameOver({restartGame}) {
    return (
      <>
        <h1 className={"game-over-header"}>Game Over</h1>
          <h3>You ran out of guesses.</h3>
          <p>Better luck next time...</p>
          <button className={"pure-button pure-button-primary"}
                  onClick={restartGame}>Restart
          </button>
      </>
    );
}

function NamesList({
  allNames,
  playerNames,
  readyPlayers
}) {

  return (
    <div className={"players-container"}>
      <label className={"guess-list-label"}>Players/Observers:</label>
      {allNames.map(name => 
        <div key={name} className={"lobby-player"}>
          <div className={!readyPlayers.includes(name) ? "unready-player" : ""}>
            {name}
          </div>
        </div>
      )}
    </div>
  );
}

function Lobby({
  playerName,
  gameName, 
  players,
  allNames,
  playerNames,
  readyPlayers
}) {

  // players is {playerName (string): ["player" | "observer", "ready" | "unready"]
  const playerReady = players[playerName][1] === "ready";
  const isObserver = players[playerName][0] === "observer";
  // TODO back button, 

  function handleReadiness(playerName) {
    ch_toggle_ready(playerName);
  }

  function handleObserve(playerName) {
    ch_toggle_observer(playerName);
  }

  function handleLeave(playerName) {
    ch_leave(playerName);
  }

  const readinessButton = (playerReady) => {
    let btn;
    if (playerReady) {
      btn = <button className={"pure-button unready-button"}
                     onClick={() => handleReadiness(playerName)}>
              Unready
             </button>
    } else {
      btn = <button className={"pure-button pure-button-primary ready-button"}
                    onClick={() => handleReadiness(playerName)}>
              Ready
            </button>
    }
    return btn;
  };

  const observerButton = (isObserver) => {
    let btn;
    if (isObserver) {
      btn = <button className={"pure-button toggle-player-button"}
                    onClick={() => handleObserve(playerName)}>
              Become Player
            </button>
    } else {
      btn = <button className={"pure-button toggle-observer-button"}
                    onClick={() => handleObserve(playerName)}>
              Become Observer
            </button>
    }
    return btn;
  };

  return (
    <div>
      <div className={"pure-g"}>
        <div className={"pure-u-2-3"}>
          <NamesList allNames={allNames}
                    playerNames={playerNames}
                    readyPlayers={readyPlayers}
          />
        </div>
        <div className={"pure-u-1-3 lobby-buttons-container"}>
          <div className={"lobby-button"}>
            {readinessButton(playerReady)}
          </div>
          <div className={"lobby-button"}>
            {observerButton(isObserver)}
          </div>
        </div>
      </div>
    </div>
  );
}

function GameRoom({
  inputValue,
  history,
  allNames,
  playerNames,
  readyPlayers,
  gameWon,
}) {

  const MAX_DIGITS = 4;
  const canSubmit = inputValue.length === MAX_DIGITS;

  function pressKey(inputValue) {
    ch_validate(inputValue);
  }

  function submitGuess(guess) {
    ch_guess(guess);
  }

  return (
    <div className={"game-container pure-g"}>
      <div className={"pure-u-1-3"}>
        <NamesList allNames={allNames}
                  playerNames={playerNames}
                  readyPlayers={readyPlayers}
        />
      </div>
      <div className={"pure-u-1-3"}>
        <GuessControls inputValue={inputValue}
                      inputHandler={pressKey}
                      submitHandler={submitGuess}
                      canSubmit={canSubmit}/>
      </div>
      <div className={"pure-u-1-3"}>
        <History guesses={history}/>
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

  const allNames = Object.keys(players);
  const playerNames = allNames.filter(name => 
    players[name][0] === "player");
  const readyPlayers = playerNames.filter(name => 
    players[name][1] === "ready");

  function handleLeave(playerName) {
    ch_leave(playerName);
  }
  
  let body;

  if (gameWon) {
    body = <GameOver restartGame={restartGame}/>;
  } else if (gamePhase == "lobby") {
    body = <Lobby
            playerName={playerName}
            gameName={gameName}
            players={players}
            allNames={allNames}
            playerNames={playerNames}
            readyPlayers={readyPlayers}
          />    
  } else if (gamePhase == "endgame") {
    // TODO maybe not needed
  } else { // gamePhase === "playing"
    body = <GameRoom 
            inputValue={inputValue}
            history={history}
            gameWon={gameWon} 
            allNames={allNames}
            playerNames={playerNames}
            readyPlayers={readyPlayers}
          />
  }

  return (
    <>
      <div className={"status-bar"}>
        <div>{`${gamePhase === "lobby" ? "Lobby" : "Game"}: ${gameName}`}</div>
        <div>
          {`${playerNames.length} players | ${readyPlayers.length} ready`}
        </div>
      </div>
      <button className={"pure-button button-main-restart"}
              onClick={() => handleLeave(playerName)}>
        &lt; Leave game
      </button>
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
          <div className={"game-title-header"}>4Digits</div>
          <div>[ Online ]</div>
        </div>
        {message && <div className={"game-message"}>{message}</div>}
      </div>
      <div>
        {body}
      </div>
    </>
  );
}
