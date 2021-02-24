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

    return (<>
              <h1>Enter a game name:</h1>
              <input type={"text"} value={gameName} autoFocus={false}
                     onChange={ev => handleKey(ev, setGameName)}></input>
              <h1>Enter your name:</h1>
              <input type={"text"} value={playerName} autoFocus={false}
                     onChange={ev => handleKey(ev, setPlayerName)} onKeyPress={pressedEnter}></input>
              <div className={"buttons-container"}>
                <button className={"pure-button pure-button-primary"}
                        disabled={!(gameName && playerName)}
                        onClick={() => ch_register({gameName: gameName, playerName: playerName})}>Submit
                </button>
              </div>
            </>);
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
  return <div className={"pure-u-1-1 guess-item"}>
    <label className={"guess-list-label"}>{player}:</label>
    {Object.keys(guessHistory).map(n => {
      <div key={n}>
        <div className={"pure-u-1-6"}>Guess no. {n}</div>
        <div className={"pure-u-1-4"}>{guessHistory[n][0]}</div>
        <div className={"pure-u-1-4"}>B: {guessHistory[n][1]}</div>
        <div className={"pure-u-1-4"}>C: {guessHistory[n][2]}</div>
        </div>
    })}
    </div>;
}

function History({history}) {

    return (
        <div className={"guesses-container"}>
          <label className={"guess-list-label"}>Guesses:</label>
          <div className={"pure-g guess-list"}>
            {Object.keys(history).map(player => {
                return <PlayerHistory key={player} player={player} guessHistory={history[player]} />;
            })}
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

// Main Game Component
export default function FourDigits() {

    const MAX_DIGITS = 4;

    // 4-tuple of digits 0-9
    const [state, setState] = React.useState({
        playerName: "",
        inputValue: "",
        history: {},
        gameWon: false,
        message: ""
    });
    const {playerName, inputValue, history, gameWon, message} = state;

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
        body = <Register message={message}/>;
    } else if (gameWon) {
        body = <GameOver restartGame={restartGame}/>;
    } else {
        const canSubmit = inputValue.length === MAX_DIGITS;
        body =
            <>
              <h1 className={"game-title-header"}>4Digits</h1>
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
        <div className={"game-container"}>
          {body}
        </div>
    );

}
