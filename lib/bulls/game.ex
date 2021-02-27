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
  def new(gameName \\ "") do
    %{
      gameName: gameName,
      answer: create4Digits(),
      gamePhase: "lobby",
      # String (playerName) -> guess
      round: %{},
      # String (playerName) -> guessHistory
      history: %{},
      # String (playerName) -> ["player" | "observer", "ready" | "unready"]
      players: %{}, # TODO rename to 'users'
      # String (playerName) -> [wins (Int), losses (Int)]
      scores: %{},
      numPlayers: 0,
      message: "",
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
    }
  end

  @doc """
  Embellish the shared game state with connection state to 
  present to the end user.
  """
  def present(game, assigns) do
    sanitizedState = Map.drop(game, [:answer, :round, :numPlayers])
    Logger.debug("PRESENTING: " <> inspect(sanitizedState))
    Map.merge(assigns, sanitizedState, fn(k, v1, v2) -> if k == :message, 
      do: if(v2 == "", do: v1, else: v2),
      else: v2 
    end) # Game messages precede user messages unless they're empty
  end

  def setMessage(game, message) do
    %{game | message: message}
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

  def makeGuess(game, playerName, guess) do
    newRound = Map.put(game.round, playerName, guess)
    %{game | round: newRound}
  end

  def setGamePhase(game, gamePhase) do
    %{game | gamePhase: gamePhase}
  end

  defp determinePlayerResult(playerName, {game, winners} = acc) do
    Logger.debug("GOT ACC: " <> inspect(acc))
    %{
      answer: answer,
      round: round,
      players: players,
      history: history,
    } = game

    observer? = List.first(Map.get(players, playerName)) == "observer"
    skippedPlayer? = !Enum.member?(Map.keys(round), playerName)
    unless observer? || skippedPlayer? do
      roundGuess = Map.get(round, playerName)
      correctGuess? = roundGuess == answer
      newWinners = if correctGuess? do 
        [playerName] ++ winners
      else 
        winners
      end

      prevGuesses = Map.get(history, playerName)
      bulls = numBulls(roundGuess, answer)
      cows = numCows(roundGuess, answer) - bulls 
      guessNumber = Enum.count(prevGuesses)
      guessAccuracy = [roundGuess, bulls, cows]
      newPlayerHistory = Map.put(prevGuesses, guessNumber, guessAccuracy)
      newHistory = Map.put(history, playerName, newPlayerHistory)
      newRound = Map.drop(round, [playerName])

      newGame = 
        game
        |> Map.put(:history, newHistory)
        |> Map.put(:round, newRound)
        |> Map.put(:message, "Nobody guessed correctly. Next round...")

      {newGame, newWinners}
    else 
      {game, winners}
    end
  end


  @doc """
  ADVANCES A ROUND
  Computes the result of the current round of guesses on the game.
  Checks for correct guesses, archives the round guesses to the 
  history along with calculated accuracies, and clears round guesses. 
  Returns the appropriate game state reflecting aforementioned results.
  If multiple players make the correct guess in a turn, they are both
  declared winners.
  """
  def determineRoundResult(%{players: players} = game) do
    
    # accumulate
    {game, winners} = List.foldr(
      Map.keys(players), 
      {game, []}, 
      fn(playerName, acc) -> determinePlayerResult(playerName, acc) end # (). ???
    ) 

    gameOver? = Enum.count(winners) > 0
    if gameOver? do
      newScores = for {name, [wins, losses]} <- game.scores, into: %{}, do:
        if Enum.member?(winners, name),
          do: 
            {name, [wins + 1, losses]},
          else:
            {name, [wins, losses + 1]} 
      newHistory = for {name, _} <- game.history, into: %{}, do: {name, %{}}
          %{game | 
            gamePhase: "endgame", 
            answer: create4Digits(), 
            scores: newScores, 
            history: newHistory}
    else
      game
    end
  end

  def setAllPlayerReadiness(%{players: players} = game, readiness) do
    # Credit: https://stackoverflow.com/questions/26614682/how-to-change-all-the-values-in-an-elixir-map
    newPlayers = for {name, [player?, ready?]} <- players, into: %{}, do:
      if player? == "player", 
        do: 
          {name, ["player", readiness]},
        else:
          {name, ["observer", ready?]} 
    %{game | players: newPlayers}
  end

  def setPlayerReadiness(%{players: players} = game, playerName, readiness) do
    newPlayers = 
      players
      |> Map.put(playerName, ["player", readiness])
    %{game | players: newPlayers}
  end

  def addPlayer(
    %{history: history, 
      players: players, 
      gamePhase: gamePhase, 
      numPlayers: numPlayers, 
      scores: scores} = game,
    playerName) do
    unless duplicateName?(players, playerName) do
      newHistory = Map.put(history, playerName, %{})
      {newPlayerStatus, incrementPlayers} = if gamePhase != "lobby" do
        {["observer", "ready"], numPlayers}
      else
        {["player", "unready"], numPlayers + 1}
      end
      newPlayers = Map.put(players, playerName, newPlayerStatus)
      newScores = Map.put(scores, playerName, [0, 0])
      %{game | 
        history: newHistory,
        players: newPlayers, 
        numPlayers: incrementPlayers, 
        scores: newScores}
      else
      # Append a random number to name if taken
      addPlayer(game, playerName <> Integer.to_string(:rand.uniform(1000)))
    end
  end

  def removePlayer(game, playerName) do
    # Remove a player from the game but keep them in the 
    # guess history
    %{game | players: Map.drop(game.players, [playerName])}
  end

  defp create4Digits() do
    digits = Enum.map(1..4, fn _ -> :rand.uniform(9) end)
    numUniq = Enum.count(Enum.uniq(digits))

    case numUniq do
      4 -> digits
      _ -> create4Digits()
    end
  end

  defp duplicateName?(players, playerName) do
    players
    |> Map.keys()
    |> Enum.any?(fn(name) -> name == playerName end)
  end

  defp numBulls(guess, answer) do
    Enum.reduce(0..(@num_digits - 1), 0, fn i, acc ->
      if Enum.at(guess, i) == Enum.at(answer, i) do
        acc + 1
      else
        acc
      end
    end)
  end

  defp numCows(guess, answer) do
    Enum.count(guess, fn d -> Enum.member?(answer, d) end)
  end

end

# end module
