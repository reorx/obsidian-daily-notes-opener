## Obsidian daily notes new tab

This plugin adds a command for opening daily notes in a new tab (so that keyboard shortcut could be used!), and gives extra control over the behavior of daily notes.

Features:
- 🌟 Provides command and sidebar button for "Open today's daily note in new tab"
- 🔎 Find and focus on the already opened note to avoid redundancy
- 🕐 Determine end of day time, let you open the right daily note in the midnight
- 🌈 Colorize the daily note pane to make it outstanding

## Settings

- End of day time

    Determine today's date, if the value is 03:00 and the current datetime is 2022-03-03 02:59, then the date for today is 2022-03-02.

    Default: `05:00`
- Always open new tab

    Set true to always open new tab even if the daily note is already opened, otherwise the plugin will try to find the existing daily note and focus on it

    Default: `false`
- Background color

    Set the background color of the daily note

    Default: `#ffffff`


## Development

First install [Hot-Reload Plugin](https://github.com/pjeby/hot-reload)

Then `cp sync-plugin.example.sh sync-plugin.sh`, set `PLUGINS_DIR` as your vault's plugins dir in `sync-plugin.sh`, e.g. `~/Documents/My-Obsidian-Vault/.obsidian/plugins`.

Run `yarn dev`, when file changes and esbuild runs the build, result files will be automatically copied to plugins directory, and Hot-Reload plugin will reload the plugin instantly.


## Credits

This project is made possible by the community surrounding it and especially the wonderful people and projects listed in this document.

### Projects

- [QuickAdd](https://github.com/chhoumann/quickadd)
- [Obsidian Daily Notes interface](https://github.com/liamcain/obsidian-daily-notes-interface)
- [Obsidian Style Settings Plugin](https://github.com/mgmeyers/obsidian-style-settings)
- [Hot-Reload Plugin for Obsidian.md Plugins](https://github.com/pjeby/hot-reload)
