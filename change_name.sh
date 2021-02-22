#!/bin/bash

# source: https://gist.github.com/krystofbe/92aed7cd03c9a631eb3c7af490525c4e

set -e

CURRENT_NAME="Bulls"
CURRENT_OTP="bulls"

NEW_NAME="Bulls"
NEW_OTP="bulls"

ack -l $CURRENT_NAME --ignore-file=is:rename_phoenix_project.sh | xargs sed -i '' -e "s/$CURRENT_NAME/$NEW_NAME/g"
ack -l $CURRENT_OTP --ignore-file=is:rename_phoenix_project.sh | xargs sed -i '' -e "s/$CURRENT_OTP/$NEW_OTP/g"

git mv lib/$CURRENT_OTP lib/$NEW_OTP
git mv lib/$CURRENT_OTP.ex lib/$NEW_OTP.ex
git mv lib/${CURRENT_OTP}_web lib/${NEW_OTP}_web
git mv lib/${CURRENT_OTP}_web.ex lib/${NEW_OTP}_web.ex
git mv test/$CURRENT_OTP test/$NEW_OTP
git mv test/${CURRENT_OTP}_web test/${NEW_OTP}_web
