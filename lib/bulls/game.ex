defmodule Bulls.Game do
  @num_digits 4
  # getter for mod attr
  def num_digits, do: @num_digits

  ### Data Definitions
  # answer, guess -> [Integer, Integer, Integer, Integer]
  # guessHistory  -> %{Integer => [Integer (numBulls), Integer (numCows)]}

  @doc """
  Create an empty game state.
  """
  def new do
    %{
      # TODO revise for new vars
      answer: create4Digits(),
      # String (playerName) -> guessHistory
      history: %{},
      gameWon: false
    }
  end

  @doc """
  Embellish the shared game state with connection state to 
  present to the end user.
  """
  def present(state, %{playerName: pname, inputValue: iv, message: msg} = _assigns) do
    {_, sanitizedState} = Map.pop(state, :answer)
    sanitizedState
    |> Map.put(:playerName, pname)
    |> Map.put(:inputValue, iv)
    |> Map.put(:message, msg)
  end

  @doc """
  Given a guess, answer, and game state, returns a new game state
  reflecting the outcome of making the guess on the game if it is
  invalid, correct, or incorrect.
  """
  def makeGuess(%{answer: answer, history: history} = game, guess, playerName) do
    prevGuesses = Map.get(history, playerName)
    if guess == answer do
      %{game | gameWon: true}
    else
      bulls = numBulls(guess, answer)
      cows = numCows(guess, answer) - bulls
      guessNumber = Enum.count(prevGuesses)
      newHistory = Map.put(prevGuesses, guessNumber, [guess, bulls, cows])
      %{game | history: newHistory}
    end
  end

  def addPlayer(%{history: history} = game, pname) do
    %{game | history: Map.put(history, pname, %{})}
  end

  @doc """
  Generate the 4 random, unique digits in [1, 9] as the answer to a game.
  """
  def create4Digits() do
    digits = Enum.map(1..4, fn _ -> :rand.uniform(9) end)
    numUniq = Enum.count(Enum.uniq(digits))

    case numUniq do
      4 -> digits
      _ -> create4Digits()
    end
  end

  @doc """
  Check if a player has already made a guess before.
  """
  def duplicateGuess?(%{history: history} = _game, playerName, guess) do
    playerGuessHistory = Map.get(history, playerName)
    numPrevGuesses = Map.keys(playerGuessHistory)

    Enum.any?(numPrevGuesses, fn i ->
      [prevGuess, _, _] = Map.get(playerGuessHistory, i)
      prevGuess == guess
    end)
  end

  @doc """
  Calculate the number of correct digits in the guess from the answer.
  """
  def numBulls(guess, answer) do
    Enum.reduce(0..(@num_digits - 1), 0, fn i, acc ->
      if Enum.at(guess, i) == Enum.at(answer, i) do
        acc + 1
      else
        acc
      end
    end)
  end

  @doc """
  Calculate number of common digits between the guess and answer.
  """
  def numCows(guess, answer) do
    Enum.count(guess, fn d -> Enum.member?(answer, d) end)
  end
end

# end module
