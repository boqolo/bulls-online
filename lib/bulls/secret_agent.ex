defmodule Bulls.SecretAgent do
  use Agent

  alias Bulls.Game

  @impl true
  def start_link(_gameId) do
    Agent.start_link(fn() -> %{answer: Game.create4Digits(), game: Game.new()} end, name: __MODULE__)
  end

  def reset do
    Agent.update(__MODULE__, fn(state) -> %{answer: Game.create4Digits(), game: Game.new()} end)
  end

  def get do
    Agent.get(__MODULE__, fn(state) -> state end)
  end

  def get_answer do
    Agent.get(__MODULE__, fn(state) -> state.answer end)
  end

end
