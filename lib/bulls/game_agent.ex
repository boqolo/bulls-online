defmodule Bulls.GameAgent do
  use Agent

  # This Agent is going to be used to hold the Registry
  # of gameName -> GameServer

  # alias Bulls.Game

  def start_link(_opts) do
    Agent.start_link(fn() -> %{} end, name: __MODULE__)
  end

  def get(name) do
    Agent.get(__MODULE__, fn(state) -> Map.get(state, name) end)
  end

  def put(name, game) do
    Agent.update(__MODULE__, fn(state) -> Map.put(state, name, game) end)
  end

end
