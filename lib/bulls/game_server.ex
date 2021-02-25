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

    GameSupervisor.start_child(spec)
  end

  def peek(gameName) do
    GenServer.call(registry(gameName), {:peek})
  end

  def addPlayer(gameName, playerName) do
    GenServer.call(registry(gameName), {:addPlayer, gameName, playerName})
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
    game = Game.new()
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
  def handle_call({:peek}, _from, gameState) do
    {:reply, gameState, gameState}
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
    {:reply, gameState1, gameState1}
  end

  @impl true
  def handle_call({:reset, gameName}, _from, gameState0) do
    gameState1 = %{Game.new() | players: Map.get(gameState0, "players")}
    GameAgent.put(gameName, gameState1)
    # {:reply, send back, new val to loop with}
    {:reply, gameState1, gameState1}
  end

  @impl true
  def handle_call({:addPlayer, _gameName, playerName}, _from, gameState0) do
    gameState1 = Game.addPlayer(gameState0, playerName)
    # GameAgent.put(gameName, gameState1)
    {:reply, gameState1, gameState1}
  end
end
