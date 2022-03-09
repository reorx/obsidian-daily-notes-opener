# Notes for development

First install [Hot-Reload Plugin](https://github.com/pjeby/hot-reload)

Then `cp sync-plugin.example.sh sync-plugin.sh`, set `PLUGINS_DIR` as your vault's plugins dir in `sync-plugin.sh`, e.g. `~/Documents/My-Obsidian-Vault/.obsidian/plugins`.

Run `yarn dev`, when file changes and esbuild runs the build, result files will be automatically copied to plugins directory, and Hot-Reload plugin will reload the plugin instantly.
