defmodule Bulls.Game do

  @max_guesses 8
  @num_digits 4
  def num_digits, do: @num_digits # getter for mod attr

  ### Data Definitions
  # answer, guess -> [Integer, Integer, Integer, Integer]
  # guessHistory  -> %{Integer => [Integer (numBulls), Integer (numCows)]}

  @doc"""
  Create an empty game state.
  """
  def new do
    %{
      inputValue: "",
      guessHistory: %{},
      gameWon: false,
      gameOver: false,
      message: ""
    }
  end

  @doc"""
  Given a guess, answer, and game state, returns a new game state
  reflecting the outcome of making the guess on the game if it is
  invalid, correct, or incorrect.
  """
  def makeGuess(guess, answer, %{guessHistory: prevGuesses} = game0) do
    unless duplicateGuess?(guess, prevGuesses) do
      if guess == answer do
        %{game0 | gameWon: true}
      else
        bulls = numBulls(guess, answer)
        cows = numCows(guess, answer) - bulls
        guessNumber = Enum.count(prevGuesses)
        newHistory = Map.put(prevGuesses, guessNumber, [guess, bulls, cows])
        game1 = %{game0 | inputValue: "", guessHistory: newHistory}
        if Enum.count(Map.keys(newHistory)) == @max_guesses do
          %{game1 | gameOver: true}
        else
          %{game1 | message: ""} # remove user message
        end
      end
    else
      %{game0 | message: "You've already made that guess"}
    end
  end

  @doc"""
  Generate the 4 random, unique digits in [1, 9] as the answer to a game.
  """
  def create4Digits() do
    digits = Enum.map(1..4, fn(_) -> :rand.uniform(9) end)
    numUniq = Enum.count(Enum.uniq(digits))
    case numUniq do
      4 -> digits
      _ -> create4Digits()
    end
  end

  @doc"""
  Check if a guess is already represented in the guessHistory.
  """
  def duplicateGuess?(guess, guessHistory) do
    numPrevGuesses = Map.keys(guessHistory)
    Enum.any?(numPrevGuesses, fn(i) -> [prevGuess, _, _] = Map.get(guessHistory, i)
      prevGuess == guess
    end)
  end

  @doc"""
  Calculate the number of correct digits in the guess from the answer.
  """
  def numBulls(guess, answer) do
    Enum.reduce(0..(@num_digits - 1), 0, fn(i, acc) ->
      if Enum.at(guess, i) == Enum.at(answer, i) do
        acc + 1
      else
        acc
      end
    end)
  end

  @doc"""
  Calculate number of common digits between the guess and answer.
  """
  def numCows(guess, answer) do
    Enum.count(guess, fn(d) -> Enum.member?(answer, d) end)
  end

end # end module
