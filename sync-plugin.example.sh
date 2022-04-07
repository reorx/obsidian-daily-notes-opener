#!/bin/bash

PLUGINS_DIR=""
PLUGIN_PATH="$PLUGINS_DIR/$(basename "$PWD")"

mkdir -p "$PLUGIN_PATH"
rsync -a build/* manifest.json "$PLUGIN_PATH"
# if .hotreload does not exist, touch it
if [ ! -f "$PLUGIN_PATH/.hotreload" ]; then
    touch "$PLUGIN_PATH/.hotreload"
fi
