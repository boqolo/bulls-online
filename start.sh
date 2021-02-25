#!/bin/bash
# TODO

#  if [[ "x$PROD" == "x" ]]; then
	#  echo "This script is for starting in production."
	#  echo "Use"
	#  echo "   mix phx.server"
	#  exit
#  fi

export SECRET_KEY_BASE=#TODO
export MIX_ENV=prod mix phx.server
export PORT=9898

echo "Stopping old copy of app, if any..."

_build/prod/rel/bulls/bin/bulls stop || true

echo "Starting app..."

_build/prod/rel/bulls/bin/bulls start
