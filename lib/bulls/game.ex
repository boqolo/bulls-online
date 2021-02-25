defmodule Bulls.Game do
  @num_digits 4
  # getter for mod attr
  def num_digits, do: @num_digits

  require Logger

  ### Data Definitions
  # answer, guess -> [Integer, Integer, Integer, Integer]
  # guessHistory  -> %{Integer => [Integer (numBulls), Integer (numCows)]}

  @doc """
  Create a new game state.
  """
  def new do
    %{
      # TODO add topic/game name
      answer: create4Digits(),
      gamePhase: "lobby",
      # String (playerName) -> guessHistory
      history: %{},
      players: %{},
      gameWon: false
    }
  end

  @doc """
  Create an empty game state, useful for resetting state.
  """
  def newEmpty do
    %{
      gamePhase: "",
      history: %{},
      players: %{},
      gameWon: false
    }
  end

  @doc """
  Embellish the shared game state with connection state to 
  present to the end user.
  """
  def present(state, %{playerName: pname, gameName: gname, inputValue: iv, message: msg} = _assigns) do
    {_, sanitizedState} = Map.pop(state, :answer)
    sanitizedState
    |> Map.put(:playerName, pname)
    |> Map.put(:gameName, gname)
    |> Map.put(:inputValue, iv)
    |> Map.put(:message, msg)
  end

  def beginGame(game) do
    %{game | gamePhase: "playing"}
  end

  def toggleReady(%{players: players} = game, playerName) do
    [_, readiness] = playerStatus = Map.get(players, playerName)
    newPlayerStatus = if readiness == "ready" do
      playerStatus
      |> List.replace_at(1, "unready")
    else
      playerStatus
      |> List.replace_at(1, "ready")
    end
    newPlayers = Map.replace(players, playerName, newPlayerStatus)
    %{game | players: newPlayers}
  end

  def toggleObserver(%{players: players} = game, playerName) do
    [observer?, _] = playerStatus = Map.get(players, playerName)
    newPlayerStatus = if observer? == "observer" do
      playerStatus
      |> List.replace_at(0, "player")
    else
      playerStatus
      |> List.replace_at(0, "observer")
    end
    newPlayers = Map.replace(players, playerName, newPlayerStatus)
    %{game | players: newPlayers}
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
      newPlayerHistory = 
        Map.put(prevGuesses, guessNumber, [guess, bulls, cows])
      newHistory = Map.put(history, playerName, newPlayerHistory)
      %{game | history: newHistory}
    end
  end

  def addPlayer(%{history: history, players: players, gamePhase: gamePhase} = game, playerName) do
    unless duplicateName?(players, playerName) do
      newHistory = Map.put(history, playerName, %{})
      newPlayerStatus = if gamePhase != "lobby" do
        ["observer", "ready"]
      else
        ["player", "unready"]
      end
      newPlayers = Map.put(players, playerName, newPlayerStatus)
      %{game | history: newHistory, players: newPlayers}
      else
      # Append a random number to name if taken
      addPlayer(game, playerName <> Integer.to_string(:rand.uniform(1000)))
    end
  end

  def removePlayer(game, playerName) do
    Map.drop(game.players, [playerName])
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

  def readyToStart?(%{players: players} = _game) do
    Map.values(players)
    |> Enum.map(fn(status) -> List.last(status) end)
    |> Enum.all?(fn(readiness) -> readiness == "ready" end)
  end

  @doc """
  Check if a player has already made a guess before.
  """
  def duplicateGuess?(%{history: history} = _game, playerName, guess) do
    Logger.debug(inspect(history))
    playerGuessHistory = Map.get(history, playerName)
    numPrevGuesses = Map.keys(playerGuessHistory)

    Enum.any?(numPrevGuesses, fn i ->
      [prevGuess, _, _] = Map.get(playerGuessHistory, i)
      prevGuess == guess
    end)
  end

  @doc """
  Check if a given name is already represented in the
  map of players.
  """
  def duplicateName?(players, playerName) do
    players
    |> Map.keys()
    |> Enum.any?(fn(name) -> name == playerName end)
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
