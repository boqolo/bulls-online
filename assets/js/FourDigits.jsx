import React from "react";
import { ch_join, ch_register, ch_guess, ch_reset, ch_validate } from "./socket";

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
            ch_register({gameName: gameName, playerName: playerName});
        }
    }

    return (<div className="register-container">
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
                        onClick={() => ch_register({gameName: gameName, playerName: playerName})}>Submit
                </button>
              </div>
            </div>);
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

function Lobby() {

  // TODO game name, list players, ready/unready, 
  // toggle observer, back button

  return (<><h1>You are in the game lobby</h1></>);
}

function Game({state}) {

  const {
    playerName,
    gamePhase,
    inputValue, 
    history, 
    gameWon, 
    message
  } = state;
  
  const MAX_DIGITS = 4;

  if (gameWon) {
      return <GameOver restartGame={restartGame}/>;
  } else if (gamePhase == "Lobby") {
      return <Lobby />    
  } else {
        const canSubmit = inputValue.length === MAX_DIGITS;
        return <>
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

}

// Main Game Component
export default function FourDigits() {

    // 4-tuple of digits 0-9
    const [state, setState] = React.useState({
        playerName: "",
        gamePhase: "",
        inputValue: "",
        history: {},
        gameWon: false,
        message: ""
    });

    const {playerName, message} = state;

    /**
     * Set channel callback.
     */
    React.useEffect(function() {
        ch_join(setState);
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
