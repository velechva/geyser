# Kill previous instances
ps aux | grep light-server | grep -v grep | awk '{ print $2; }' | xargs kill -9

# Serve on port 7000
cd geyser-ui
light-server -s . -p 7000 &
open "http://localhost:7000"

# Deploy contracts to ganache
# cd geyser-api
# truffle deploy

