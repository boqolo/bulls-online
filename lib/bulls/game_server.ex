defmodule Bulls.GameServer do
  use GenServer

  alias Bulls.{Game, GameAgent, GameSupervisor}
  require Logger

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

  def beginGame(gameName) do
    GenServer.call(registry(gameName), {:beginGame})
  end

  def addPlayer(gameName, playerName) do
    GenServer.cast(registry(gameName), {:addPlayer, gameName, playerName})
  end

  def removePlayer(gameName, playerName) do
    GenServer.cast(registry(gameName), {:removePlayer, gameName, playerName})
  end

  def toggleReady(gameName, playerName) do
    GenServer.call(registry(gameName), {:toggleReady, playerName})
  end

  def toggleObserver(gameName, playerName) do
    GenServer.call(registry(gameName), {:toggleObserver, playerName})
  end

  def readyToStart?(gameName) do
    GenServer.call(registry(gameName), {:readyToStart?})
  end

  def duplicateGuess?(gameName, playerName, guess) do
    GenServer.call(registry(gameName), {:duplicateGuess?, playerName, guess})
  end

  # TODO maybe cast and then broadcast?
  def makeGuess(gameName, playerName, guess) do
    GenServer.call(registry(gameName), {:guess, gameName, playerName, guess})
  end

  def reset(gameName) do
    GenServer.call(registry(gameName), {:reset})
  end

  defp broadcastAfter(ms) do
    Process.send_after(self(), :broadcast, ms, [])
  end

  defp sendBroadcast() do
    Process.send(self(), :broadcast, [])
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
  def handle_call({:peek}, _from, gameState) do
    {:reply, gameState, gameState}
  end

  @impl true
  def handle_call({:readyToStart?}, _from, gameState0) do
    ready? = Game.readyToStart?(gameState0)
    {:reply, ready?, gameState0}
  end

  @impl true
  def handle_call({:beginGame}, _from, gameState0) do
    gameState1 = Game.beginGame(gameState0)
    broadcastAfter(5_000)
    {:noreply, gameState1}
  end

  @impl true
  def handle_call({:toggleReady, playerName}, _from, gameState0) do
    gameState1 = Game.toggleReady(gameState0, playerName)
    # FIXME
    sendBroadcast()
    {:noreply, gameState1}
  end

  @impl true
  def handle_call({:toggleObserver, playerName}, _from, gameState0) do
    gameState1 = Game.toggleObserver(gameState0, playerName)
    sendBroadcast()
    {:noreply, gameState1}
  end

  @impl true
  def handle_call({:reset, gameName}, _from, gameState0) do
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
  def handle_call({:guess, _gameName, playerName, guess}, _from, gameState0) do
    gameState1 = Game.makeGuess(gameState0, guess, playerName)
    # GameAgent.put(gameName, gameState1)
    sendBroadcast()
    {:noreply, gameState1}
  end

  @impl true
  def handle_cast({:removePlayer, _gameName, playerName}, gameState0) do
    gameState1 = Game.removePlayer(gameState0, playerName)
    # GameAgent.put(gameName, gameState1)
    sendBroadcast()
    {:noreply, gameState1}
  end

  @impl true
  def handle_cast({:addPlayer, _gameName, playerName}, gameState0) do
    gameState1 = Game.addPlayer(gameState0, playerName)
    # GameAgent.put(gameName, gameState1)
    sendBroadcast()
    {:noreply, gameState1}
  end

end
