## Obsidian daily notes opener

This plugin adds a command for opening daily notes in a new pane (so that a keyboard shortcut could be used!) and gives extra control over the behavior of daily notes.

Features:
- ⚡️ Provides command and sidebar button for "Open today's daily note in new pane"
- 🔎 Find and focus on the already opened note to avoid redundancy
- 🕐 Determine end of day time, let you open the right daily note at midnight
- 📝 Append line to a specific section after opening the note
- 🌈 Colorize the daily note pane to make it outstanding (using [Style Settings](https://github.com/mgmeyers/obsidian-style-settings), support themed colors)

Installation: search for "**Daily notes opener**" in Community plugins.

## Usage

### 1. Open today's periodic notes in new pane, in an idempotent way
![dnnt-demo-1](https://user-images.githubusercontent.com/405972/161797452-aae4a358-e0d8-4a50-84f6-47547d0c05a1.gif)

### 2. Change background color for today's perodic notes, using Style Settings

![dnnt-demo-2](https://user-images.githubusercontent.com/405972/161797369-b842d6ab-91b0-486a-82a6-6ec00bcdfd9e.gif)

### 3. Append line for today's periodic notes in new pane
![dnnt-demo-3](https://user-images.githubusercontent.com/405972/161797474-ef56562d-a71e-4559-a209-bea376043bb9.gif)

## Settings

- End of day time

    Determine today's date, if the value is 03:00 and the current date-time is 2022-03-03 02:59, then the date for today is 2022-03-02.

    Default: `05:00`
- Always open a new pane

    Set true to always open a new pane even if the daily note is already opened, otherwise, the plugin will try to find the existing daily note and focus on it

    Default: `false`
- Background color

    Daily notes new pane plugin adds support for colorizing today's periodic note, this functionality relies on another plugin called "Style Settings", please install and enable it so that you can adjust background colors for periodic notes
    <img width="773" alt="image" src="https://user-images.githubusercontent.com/405972/161797925-0074ec9d-e696-4014-8745-35823525ac70.png">


## FAQ

- Q: Does this work with [Periodic Notes](https://github.com/liamcain/obsidian-periodic-notes)?

	A: Yes, if *Daily Notes* in the **Periodic Notes** plugin is enabled, it will use settings from Periodic Notes, otherwise, it will use settings from the **Daily notes core plugin**.

## Credits

This project is made possible by the community surrounding it and especially the wonderful projects listed in this document.

### Projects

- [Obsidian Daily Notes interface](https://github.com/liamcain/obsidian-daily-notes-interface)
- [QuickAdd](https://github.com/chhoumann/quickadd)
- [Obsidian Style Settings Plugin](https://github.com/mgmeyers/obsidian-style-settings)
- [Lumberjack](https://github.com/ryanjamurphy/lumberjack-obsidian)
- [Customizable Sidebar Plugin](https://github.com/phibr0/obsidian-customizable-sidebar)
- [Hot-Reload Plugin for Obsidian.md Plugins](https://github.com/pjeby/hot-reload)
