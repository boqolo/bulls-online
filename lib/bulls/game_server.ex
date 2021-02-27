defmodule Bulls.GameServer do
  use GenServer

  alias Bulls.{Game, GameAgent, GameSupervisor}
  require Logger

  @guessTime 30_000

  # Client API

  # This is like a ticket identifier to use the name to
  # get the Process in the Registry of GameServers
  def registry(gameName) do
    {:via, Registry, {Bulls.GameRegistry, gameName}}
  end

  def start(gameName) do
    # Start a new GameServer Process and get it supervised
    spec = %{
      id: __MODULE__,
      # call 'this' start_link on begin
      start: {__MODULE__, :start_link, [gameName]},
      restart: :permanent,
      type: :worker
    }
    Logger.debug("************ NEW GAME SERVER STARTED")
    GameSupervisor.start_child(spec)
  end

  def peek(gameName) do
    GenServer.call(registry(gameName), {:peek})
  end

  def readyToAdvance?(gameName) do
    GenServer.call(registry(gameName), {:readyToAdvance?})
  end

  def duplicateGuess?(gameName, playerName, guess) do
    GenServer.call(registry(gameName), {:duplicateGuess?, playerName, guess})
  end

  def reset(gameName) do
    GenServer.call(registry(gameName), {:reset})
  end

  def advanceGame(gameName) do
    GenServer.cast(registry(gameName), {:advanceGame})
  end

  def addPlayer(gameName, playerName) do
    GenServer.cast(registry(gameName), {:addPlayer, playerName})
  end

  def removePlayer(gameName, playerName) do
    GenServer.cast(registry(gameName), {:removePlayer, playerName})
  end

  def toggleObserver(gameName, playerName) do
    GenServer.cast(registry(gameName), {:toggleObserver, playerName})
  end

  def makeGuess(gameName, playerName, guess) do
    GenServer.cast(registry(gameName), {:guess, playerName, guess})
  end

  def determineRoundResult(gameName) do
    GenServer.cast(registry(gameName), {:determineRoundResult})
  end

  def setPlayerReadiness(gameName, playerName, readiness) do
    GenServer.cast(registry(gameName), {:setPlayerReadiness, playerName, readiness})
  end

  defp sendBroadcast() do
    Process.send(self(), :broadcast, [])
  end

  defp sendBroadcastAfter(ms) do
    Process.send_after(self(), :broadcast, ms, [])
  end

  # Callbacks
  # These correspond with Client API `call`s

  def start_link(gameName) do
    # Starts the Process instance and calls init
    # game =
    #   if GameAgent.get(gameName) do
    #     GameAgent.get(gameName)
    #   else
    #     GameAgent.put(gameName, Game.new())
    #     GameAgent.get(gameName)
    #   end
    game = Game.new(gameName)
    Logger.debug("GameServer start_link: " <> inspect(game))
    GenServer.start_link(__MODULE__, game, name: registry(gameName))
  end

  @impl true
  def init(gameState0) do
    # REQUIRED: This is invoked when the GenServer process is started and is
    # called by `start_link`. Blocking until it returns.
    {:ok, gameState0}
  end

  @impl true
  def handle_info(:broadcast, gameState) do 
    %{gameName: gameName} = gameState
    Logger.debug("BROADCAST TO GAME: " <> gameName)
    BullsWeb.Endpoint.broadcast!("game:" <> gameName, "present", gameState)
    {:noreply, gameState}
  end

  @impl true
  def handle_info({:timeExpired, guessed}, gameState0) do 
    Logger.debug("\n\n\n\n\nTIMEOUT: " <> inspect(guessed) <> "--" <> inspect(gameState0.numPlayers))
    # if sofar != numPlayers
    gameState1 = if guessed != gameState0.numPlayers do
      Game.setAllPlayerReadiness(gameState0, "ready")
    else
      gameState0
    end
    sendBroadcast()
    {:noreply, gameState1}
  end

  @impl true
  def handle_info(:advanceGame, gameState0) do
    %{gamePhase: gamePhase} = gameState0
    gameState1 = case gamePhase do
      "lobby" -> gameState0
        |> Game.setGamePhase("playing")
        |> Game.setAllPlayerReadiness("unready")
        |> Game.setMessage("")
      "endgame" -> gameState0
        |> Game.setGamePhase("lobby")
        |> Game.setAllPlayerReadiness("unready")
        |> Game.setMessage("Round over. Somebody guessed correctly!")
      _ -> gameState0
        |> Game.setAllPlayerReadiness("unready")
        |> Game.setMessage("You have 30 seconds to place a guess.")
    end
    Process.send_after(self(), {:timeExpired, Enum.count(Map.keys(gameState1.round))}, @guessTime, [])
    # Set minimal delay to ensure socket state for each player gets
    # set properly to receive broadcast state
    sendBroadcastAfter(5_00)
    {:noreply, gameState1}
  end

  @impl true
  def handle_call({:readyToAdvance?}, _from, %{players: players, round: round, numPlayers: numPlayers} = gameState0) do
    anyUnreadyPlayers? = fn() -> 
      Enum.any?(Map.keys(players), fn(player) -> 
        [player?, readiness] = Map.get(players, player)
        if player? == "player", do: readiness == "unready", else: false 
      end) 
    end
    receivedAllGuesses? = Enum.count(Map.keys(round)) == numPlayers
    # Second clause added for determining if lobby is ready. Since more expensive, first clause introduced
    ready? = receivedAllGuesses? || !anyUnreadyPlayers?.() 
    {:reply, ready?, gameState0}
  end

  @impl true
  def handle_call({:peek}, _from, gameState) do
    {:reply, gameState, gameState}
  end

  @impl true
  def handle_call({:reset}, _from, %{gameName: gameName} = gameState0) do
    # FIXME remove?
    gameState1 = %{Game.new() | players: Map.get(gameState0, "players")}
    GameAgent.put(gameName, gameState1)
    # {:reply, send back, new val to loop with}
    {:reply, gameState1, gameState1}
  end

  @impl true
  def handle_call({:duplicateGuess?, playerName, guess}, _from, gameState0) do
    dupe? = Game.duplicateGuess?(gameState0, playerName, guess)
    {:reply, dupe?, gameState0}
  end

  @impl true
  def handle_cast({:addPlayer, playerName}, gameState0) do
    gameState1 = Game.addPlayer(gameState0, playerName)
    # GameAgent.put(gameName, gameState1)
    sendBroadcast()
    {:noreply, gameState1}
  end

  @impl true
  def handle_cast({:removePlayer, playerName}, gameState0) do
    gameState1 = Game.removePlayer(gameState0, playerName)
    # GameAgent.put(gameName, gameState1)
    Logger.debug("AFTER REMOVE: " <> inspect(gameState1))
    sendBroadcast()
    {:noreply, gameState1}
  end

  @impl true
  def handle_cast({:toggleObserver, playerName}, gameState0) do
    gameState1 = Game.toggleObserver(gameState0, playerName)
    sendBroadcast()
    {:noreply, gameState1}
  end

  @impl true
  def handle_cast({:guess, playerName, guess}, gameState0) do
    gameState1 = Game.makeGuess(gameState0, playerName, guess)
    # GameAgent.put(gameName, gameState1)
    {:noreply, gameState1}
  end

  @impl true
  def handle_cast({:determineRoundResult}, gameState0) do
    gameState1 = Game.determineRoundResult(gameState0)
    # sendBroadcast()
    {:noreply, gameState1}
  end

  @impl true
  def handle_cast({:setPlayerReadiness, playerName, readiness}, gameState0) do
    gameState1 = Game.setPlayerReadiness(gameState0, playerName, readiness)
    sendBroadcast()
    {:noreply, gameState1}
  end

  @impl true
  def handle_cast({:advanceGame}, gameState0) do
    Process.send(self(), :advanceGame, [])
    {:noreply, gameState0}
  end

end
