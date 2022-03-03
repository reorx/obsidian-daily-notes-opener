## Obsidian daily notes new tab

Gives your Obsidian the ability to open daily notes in a new tab, so that the previous file you are working on won't be covered.

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
