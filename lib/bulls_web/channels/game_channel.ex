defmodule BullsWeb.GameChannel do
  # imports module functions to ns
  use BullsWeb, :channel

  # aliasing modules for easier use
  alias Bulls.{Game, GameServer}
  require Logger

  @impl true
  def join("game:" <> _name, _payload, socket0) do
    socket1 =
      socket0
      |> assign(gameName: "")
      |> assign(playerName: "")

    {:ok, socket1}
  end

  @impl true
  def handle_in("register", %{"gameName" => gname, "playerName" => pname} = _args, socket0) do
    Logger.debug("REGISTER: " <> inspect(socket0))
    pname = String.trim(pname)
    gname = String.trim(gname)

    if validName?(gname) && validName?(pname) do
      # TODO not always starting a new game
      # TODO add topic to game state
      noGameServerRunning? = Registry.lookup(Bulls.GameRegistry, gname) == []
      if noGameServerRunning?, do: GameServer.start(gname)
      GameServer.addPlayer(gname, pname)

      socket1 =
        socket0
        |> assign(gameName: gname)
        |> assign(playerName: pname)
        |> assign(inputValue: "")
        |> assign(message: "Welcome " <> pname <> "! Play or observe. Click ready to start.")

      game = 
        GameServer.peek(gname)
        |> Game.present(socket1.assigns)

      {:reply, {:ok, game}, socket1}
    else
      # {status, {status response}, socketConn}
      # # TODO send error
      socket1 =
        socket0
        |> assign(message: "Invalid game or player name. Try again.")

      game = 
        Game.newEmpty()
        |> Game.present(socket1.assigns)

      {:reply, {:error, game}, socket1}
    end
  end

  @impl true
  def handle_in("leave", playerName, socket0) do
    # TODO send close channel connection  message
    gname = socket0.assigns.gameName
    GameServer.removePlayer(gname, playerName)

    socket1 =
      socket0
      |> assign(gameName: "")
      |> assign(playerName: "")
      |> assign(message: "")

    state = 
      Game.newEmpty()
      |> Game.present(socket1.assigns)

    {:reply, {:ok, state}, socket1}
  end

  @impl true
  def handle_in("toggle_ready", playerName, socket0) do
    gname = socket0.assigns.gameName
    GameServer.toggleReady(gname, playerName)

    if GameServer.readyToStart?(gname) do
      GameServer.beginGame(gname)
      # [{serverPid, _}] = Registry.lookup(Bulls.GameRegistry, gname)
      # Logger.debug("SERVER REGISTRY: " <> inspect(serverPid))
      # Process.send(serverPid, :begin, [])
      {:noreply, socket0}
    else
      socket1 = 
        socket0
        |> assign(message: "Please wait. The game will start when everyone is ready.")

      game = GameServer.peek(gname) |> Game.present(socket1.assigns)

      {:reply, {:ok, game}, socket1}
    end
  end

  @impl true
  def handle_in("toggle_observer", playerName, socket0) do
    gname = socket0.assigns.gameName
    GameServer.toggleObserver(gname, playerName)
    game = GameServer.peek(gname)
    formatStr = fn(role) -> if role == "player" do
        "a player" 
      else 
        "an observer"
      end
    end

    newRole = 
      game.players
      |> Map.get(playerName)
      |> List.first()
      |> formatStr.()

    socket1 = 
      socket0
      |> assign(message: "You are " <> newRole <> ". Please wait for the game to start.")

    game = GameServer.peek(gname) |> Game.present(socket1.assigns)

    {:reply, {:ok, game}, socket1}
  end

  @impl true
  def handle_in("guess", guessStr, socket0) do
    %{gameName: gname, playerName: pname} = socket0.assigns
    guess = parseGuess(guessStr)

    {game, socket} =
      unless GameServer.duplicateGuess?(gname, pname, guess) do
        # remove user message
        socket1 =
          socket0
          |> assign(message: "")
          |> assign(inputValue: "")

        game1 = 
          GameServer.makeGuess(gname, pname, guess)
          |> Game.present(socket1.assigns)

        {game1, socket1}
      else
        # add user message
        socket1 = socket0 |> assign(message: "You've already made this guess.")
        game1 = 
          GameServer.peek(gname)
          |> Game.present(socket1.assigns)

        {game1, socket1}
      end

    {:reply, {:ok, game}, socket}
  end

  # this tells you that you are implementing functions from another module
  @impl true
  def handle_in("reset", _payload, socket0) do
    socket1 = assign(socket0, game: Game.new())
    {:reply, {:ok, socket1.assigns.game}, socket1}
  end

  @impl true
  def handle_in("validate", inputValue, socket0) do
    Logger.debug("Received: " <> inspect(inputValue))
    %{gameName: gname} = socket0.assigns
    game0 = GameServer.peek(gname)
    # reject non-digits, 0, duplicated digits, and impose limit
    {game, socket} =
      unless invalidInput?(inputValue) do
        socket1 = assign(socket0, inputValue: inputValue)
        game1 = game0 |> Game.present(socket1.assigns)
        {game1, socket1}
      else
        game1 = game0 |> Game.present(socket0.assigns)
        {game1, socket0}
      end

    {:reply, {:ok, game}, socket}
  end

  intercept ["present"]

  # This will intercept outgoing presentation events and embellish them. yay
  @impl true
  def handle_out("present", state, socket) do
    newAssigns = %{socket.assigns | message: ""}
    newState = state |> Game.present(newAssigns)
    push(socket, "present", newState)
    {:noreply, socket}
  end

  defp validName?(playerName) do
    String.length(playerName) > 0 && String.valid?(playerName) && String.length(playerName) < 10
  end

  # Checks if given input string could form a valid guess.
  defp invalidInput?(inputValue) do
    invalidChar = Regex.match?(~r/\D|0/, inputValue)
    maxInput = String.length(inputValue) > Game.num_digits()

    duplicateDigit =
      Enum.count(Enum.uniq(String.graphemes(inputValue))) < String.length(inputValue)

    invalidChar || duplicateDigit || maxInput
  end

  # Converts a valid guess string (string of 4 unique digits) into a
  # a guess tuple [Integer, Integer, Integer, Integer] for processing.
  defp parseGuess(guessStr) do
    guessStr
    |> String.graphemes()
    |> Enum.map(fn d -> elem(Integer.parse(d), 0) end)
  end
end
