defmodule Bulls.GameSupervisor do
  use DynamicSupervisor

  # This module defines how to create and interact with
  # a BullsSupervisor Process.

  def start_link(_) do
    opts = [
      name: __MODULE__,
      strategy: :one_for_one
    ]
    DynamicSupervisor.start_link(opts)
  end

  def init(_opts) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  def start_child(spec) do
    # This makes the Supervisor process monitor a child with
    # the given specification on how to take care of it.
    DynamicSupervisor.start_child(__MODULE__, spec)
  end

end
