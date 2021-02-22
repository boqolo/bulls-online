import React from "react";
import { ch_join, ch_guess, ch_reset, ch_validate } from "./socket";

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

function GuessHistory({guesses}) {

    return (
        <div className={"guesses-container"}>
          <label className={"guess-list-label"}>Guesses:</label>
          <div className={"pure-g guess-list"}>
            {Object.keys(guesses).map(k => {
                return <div key={k.toString()} className={"pure-u-1-1 guess-item"}>
                         <div className={"pure-u-1-6"}>#{parseInt(k) + 1}</div>
                         <div className={"pure-u-1-4"}>{guesses[k][0]}</div>
                         <div className={"pure-u-1-4"}>B: {guesses[k][1]}</div>
                         <div className={"pure-u-1-4"}>C: {guesses[k][2]}</div>
                       </div>;
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
        inputValue: "",
        guessHistory: {},
        gameWon: false,
        gameOver: false,
        message: ""
    });
    const {inputValue, guessHistory, gameWon, gameOver, message} = state;

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

    if (gameOver) {
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
                      guessesSoFar={guessHistory}
                      canSubmit={canSubmit}/>
       <div className={"button-main-restart-container"}>
         <button className={"pure-button button-main-restart"}
                 onClick={restartGame}>Restart
         </button>
       </div>
       {message && <div className="alert-warning">{message}</div>}
     </>}
              <GuessHistory guesses={guessHistory}/>
            </>;
    }


    return (
        <div className={"game-container"}>
          {body}
        </div>
    );

}
