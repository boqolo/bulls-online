defmodule BullsWeb.InitChannel do
  use  BullsWeb, :channel

  # aliasing modules for easier use
  # alias Bulls.{Game, GameServer}
  # require Logger

  @impl true
  def join("init", _payload, socket0) do
    socket1 =
      socket0
      |> assign(gameName: "")
      |> assign(playerName: "")

    {:ok, socket1}
  end 

end
