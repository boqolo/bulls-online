defmodule BullsWeb.GameChannel do
  use BullsWeb, :channel # imports module functions to ns

  alias Bulls.{Game} # aliasing modules for easier use
  require Logger

  @impl true
  def join("game:" <> _number, _payload, socket0) do
    # This is required to be defined to handle joining the channel
    socket1 = assign(socket0, game: Game.new(), answer: Game.create4Digits())
    Logger.debug(inspect(socket1.assigns.answer))
    {:ok, socket1.assigns.game, socket1} # send response. {status, jsonResp, socketConn}
  end

  @impl true
  def handle_in("guess", guessStr, socket0) do
    # These are required to match requests hitting the channel
    %{game: game, answer: answer} = socket0.assigns
    Logger.debug(inspect(socket0.assigns.game))
    updatedGame = guessStr
    |> parseGuess()
    |> Game.makeGuess(answer, game)
    socket1 = assign(socket0, game: updatedGame)
    {:reply, {:ok, updatedGame}, socket1} # {status, {status response}, socketConn}
  end

  # this tells you that you are implementing functions from another module
  @impl true
  def handle_in("reset", _payload, socket0) do
    socket1 = assign(socket0, game: Game.new())
    {:reply, {:ok, socket1.assigns.game}, socket1}
  end

  @impl true
  def handle_in("validate", inputValue, socket0) do
    %{game: game0} = socket0.assigns
    # reject non-digits, 0, duplicated digits, and impose limit
    unless invalidInput?(inputValue) do
      game1 = %{game0 | inputValue: inputValue}
      socket1 = assign(socket0, game: game1)
      {:reply, {:ok, game1}, socket1}
    else
      {:reply, {:ok, game0}, socket0}
    end
  end

  @doc"""
  Checks if given input string could form a valid guess.
  """
  defp invalidInput?(inputValue) do
    invalidChar = Regex.match?(~r/\D|0/, inputValue)
    maxInput = String.length(inputValue) > Game.num_digits
    duplicateDigit = Enum.count(Enum.uniq(String.graphemes(inputValue))) < String.length(inputValue)
    invalidChar || duplicateDigit || maxInput
  end

  @doc"""
  Converts a valid guess string (string of 4 unique digits) into a
  a guess tuple [Integer, Integer, Integer, Integer] for processing.
  """
  defp parseGuess(guessStr) do
    guessStr
    |> String.graphemes()
    |> Enum.map(fn(d) -> elem(Integer.parse(d), 0) end)
  end

end
