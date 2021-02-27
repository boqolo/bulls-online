#!/bin/bash

git checkout master
git pull
git checkout prod
git merge master
./deploy.sh
