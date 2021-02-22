defmodule BullsWeb.PageController do
  use BullsWeb, :controller

  def index(conn, _params) do
    render(conn, "index.html")
  end
end
