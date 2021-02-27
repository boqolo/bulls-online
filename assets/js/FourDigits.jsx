import React from "react";
import { 
  ch_init, 
  ch_skip_guess, 
  ch_join, 
  ch_leave, 
  ch_guess, 
  ch_toggle_observer, 
  ch_reset, 
  ch_validate, 
  ch_toggle_ready 
} from "./socket";

function Register({message}) {
  const [gameName, setGameName] = React.useState("");
  const [playerName, setPlayerName] = React.useState("");

  function handleJoin(gname, pname) {
    ch_join({gameName: gname.trim(), playerName: pname.trim()});
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
      <div className={"register-header"}>Start or Join a game!</div>
      <div className="register-container">
        <h2>Enter a game name</h2>
        <input type={"text"} value={gameName} autoFocus={false}
               onChange={ev => handleKey(ev, setGameName)}></input>
        <h2>What is your name?</h2>
        <input type={"text"} value={playerName} autoFocus={false}
              onChange={ev => handleKey(ev, setPlayerName)}
              onKeyPress={ev => pressedEnter(ev, gameName, playerName)}>
        </input>
        <div className={"register-buttons-container"}>
          <button className={"pure-button pure-button-primary"}
                  disabled={!(gameName && playerName)}
                  onClick={() => handleJoin(gameName, playerName)}>
            Start
          </button>
          <div className={"help-link"}>
            <a href={"https://en.wikipedia.org/wiki/Bulls_and_Cows"}>How to play</a>
          </div>
        </div>
      </div>
      {message && <div className={"register-message"}>{message}</div>}
    </div>
  );
}

function GuessControls({
  inputValue,
  canSubmit,
  hasSubmitted
}) {

  function handleKey(inputValue) {
    ch_validate(inputValue);
  }

  function handleSubmit(guess) {
    ch_guess(guess);
  }

  function handleSkipGuess() {
    ch_skip_guess();
  }

  /**
   * Push input changes server-side for validation.
   * @param ev Keyboard event
   */
  function setTextInput(ev) {
    const newInputValue = ev.target.value;
    // send what the updated input would look like. server
    // will either accept or reject changes.
    // // TODO ch_validate
    handleKey(newInputValue);
  }

  /**
   * Allow pressing enter for guess submission.
   * @param ev Keyboard event
   */
  function pressedEnter(ev) {
    if (ev.key === "Enter" && canSubmit) {
      handleSubmit(inputValue);
    }
  }

  return (
    <div className={"input-container"} role={"group"}>
      <input className={"guess-field"}
             type={"text"}
             value={inputValue}
             disabled={hasSubmitted}
             onKeyPress={pressedEnter}
             autoFocus={false}
             onChange={setTextInput}/>
      <div className={"buttons-container"}>
        <button className={"pure-button"}
                onClick={() => handleKey("")}>
          Clear
        </button>
        <button className={"pure-button pure-button-primary"}
                disabled={!canSubmit}
                onClick={() => handleSubmit(inputValue)}>
          Submit
        </button>
        <button className={"pure-button"}
                disabled={hasSubmitted}
                onClick={handleSkipGuess}>
          Skip
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

function NamesList({
  allNames,
  playerNames,
  readyPlayers
}) {

  return (
    <div className={"players-container"}>
      <label className={"guess-list-label"}>Players/Observers:</label>
      {allNames.map(name => 
        <div key={`p-${name}`} className={"lobby-player"}>
          <div className={!readyPlayers.includes(name) ? "unready-player" : ""}>
            {name}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoresList({scores}) {
  console.log(Object.keys(scores));

  return (
    <div>
      <label className={"guess-list-label"}>Scores:</label>
      {Object.keys(scores).map(player => 
        <div key={`${player}-s`} className={"guess-item"}>
          <div className={"pure-g"}>
            <div className={"pure-u-1-3"}>
              {player}
            </div>
            <div className={"pure-u-1-3"}>
              {`W: ${scores[player][0]}`}
            </div>
            <div className={"pure-u-1-3"}>
              {`L: ${scores[player][1]}`}
            </div>
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
  scores,
}) {

  const allNames = Object.keys(players);
  const playerNames = allNames.filter(name => 
    players[name][0] === "player");
  const readyPlayers = playerNames.filter(name => 
    players[name][1] === "ready");
  const playerReady = players[playerName][1] === "ready";
  const isObserver = players[playerName][0] === "observer";

  function handleReadiness() {
    ch_toggle_ready();
  }

  function handleObserve() {
    ch_toggle_observer();
  }

  const readinessButton = (playerReady) => {
    let btn;
    if (playerReady) {
      btn = <button className={"pure-button unready-button"}
                     onClick={handleReadiness}>
              Unready
             </button>
    } else {
      btn = <button className={"pure-button pure-button-primary ready-button"}
                    onClick={handleReadiness}>
              Ready
            </button>
    }
    return btn;
  };

  const observerButton = (isObserver) => {
    let btn;
    if (isObserver) {
      btn = <button className={"pure-button toggle-player-button"}
                    onClick={handleObserve}>
              Become Player
            </button>
    } else {
      btn = <button className={"pure-button toggle-observer-button"}
                    onClick={handleObserve}>
              Become Observer
            </button>
    }
    return btn;
  };

  return (
    <div>
      <div className={"pure-g"}>
        <div className={"pure-u-9-24"}>
          <NamesList allNames={allNames}
                    playerNames={playerNames}
                    readyPlayers={readyPlayers}
          />
        </div>
        <div className={"pure-u-9-24 lobby-buttons-container"}>
          <div className={"lobby-button"}>
            {!isObserver && readinessButton(playerReady)}
          </div>
          <div className={"lobby-button"}>
            {observerButton(isObserver)}
          </div>
        </div>
        <div className={"pure-u-6-24"}>
          <ScoresList scores={scores}/>
        </div>
      </div>
    </div>
  );
}

function GameRoom({
  inputValue,
  playerName,
  players,
  history,
}) {

  const MAX_DIGITS = 4;
  const allNames = Object.keys(players);
  const playerNames = allNames.filter(name => 
    players[name][0] === "player");
  const readyPlayers = playerNames.filter(name => 
    players[name][1] === "ready");
  const canSubmit = inputValue.length === MAX_DIGITS;
  const playerReady = players[playerName][1] === "ready";
  const isPlayer = players[playerName][0] === "player";

  const playerView = (playerReady) => {
    let view;
    if (playerReady) {
      view = <>
               <h2>Waiting for players...</h2>
               <div>Some are still guessing</div>
             </>
    } else {
      view = <GuessControls 
              inputValue={inputValue}
              canSubmit={canSubmit}
              hasSubmitted={playerReady}
             />
    }
    return view;
  };

  return (
    <div className={"game-container pure-g"}>
      <div className={"pure-u-1-3"}>
        <NamesList allNames={allNames}
                  playerNames={playerNames}
                  readyPlayers={readyPlayers}
        />
      </div>
      <div className={"pure-u-1-3"}>
        {isPlayer ? 
          playerView(playerReady)
          : <>
              <h2>Observing game...</h2>
              <div>You may join the next round if you like</div>
            </>}
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
    message,
    scores
  } = state;

  const allNames = Object.keys(players);
  const playerNames = allNames.filter(name => 
    players[name][0] === "player");
  const readyPlayers = playerNames.filter(name => 
    players[name][1] === "ready");

  function handleLeave() {
    ch_leave();
  }
  
  let body;

  if (gamePhase == "lobby") {
    body = <Lobby
            playerName={playerName}
            gameName={gameName}
            players={players}
            scores={scores}
          />    
  } else { // gamePhase === "playing"
    body = <GameRoom 
            inputValue={inputValue}
            playerName={playerName}
            players={players}
            history={history}
          />
  }

  return (
    <>
      <div className={gamePhase === "lobby" ? "green-status-bar" : "blue-status-bar"}>
        <div>{`${gamePhase === "lobby" ? "Lobby" : "Game"}: ${gameName}`}</div>
        <div>
          {`${playerNames.length} players | ${readyPlayers.length} ready`}
        </div>
      </div>
      <button className={"pure-button button-main-restart"}
              onClick={handleLeave}>
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
    // {playerName (string): ["player" | "observer", "ready" | "unready"]
    players: {}, 
    message: "",
    scores: {}
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
          <div className={"game-title-header"}>Bulls</div>
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
