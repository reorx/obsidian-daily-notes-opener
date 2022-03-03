import {
	App, Notice, Plugin, PluginSettingTab, Setting,
	TFile, WorkspaceLeaf, normalizePath
} from 'obsidian';
import {
	openFile, NewTabDirection, FileViewMode,
	getContainerElfromLeaf, getFileFromLeaf, getDailyNotesSettings,
} from './utils'

interface PluginSettings {
	endOfDayTime: string;
	alwaysOpenNewTab: boolean;
	backgroundColor: string;
}

const DEFAULT_SETTINGS: PluginSettings = {
	endOfDayTime: '05:00',
	alwaysOpenNewTab: false,
	backgroundColor: '#fefaea',
}

const getTodayNotePath = (settings: PluginSettings, dailyNotesSettings: any) => {
	let { folder, format } = dailyNotesSettings
	if (!format) {
		format = 'yyyy-MM-DD'
	}
	const splited = settings.endOfDayTime.split(':').map(Number)
	const now = window.moment()
	const shifted = now.clone().subtract(splited[0], 'hours').subtract(splited[1], 'minutes')
	// console.log('now', now.format('HH:mm'), 'shifted', shifted.format('HH:mm'))

	const todayPath = normalizePath(`${folder}/${shifted.format(format)}.md`);
	return todayPath
}

const addTodayNoteClass = (leaf: WorkspaceLeaf) => {
	const el = getContainerElfromLeaf(leaf)
	el.addClass('is-today-note')
}

const openTodayNoteInNewTab = async (app: App, settings: PluginSettings, dailyNotesSettings: any) => {
	const todayPath = getTodayNotePath(settings, dailyNotesSettings)

	if (settings.alwaysOpenNewTab) {
		await openPathInNewTab(app, todayPath)
		return
	}

	// try to find a existing tab
	var todayNoteLeaf: WorkspaceLeaf
	app.workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
		const file: TFile = getFileFromLeaf(leaf)
		if (file && file.path === todayPath) {
			todayNoteLeaf = leaf
			return
		}
	})

	if (todayNoteLeaf) {
		addTodayNoteClass(todayNoteLeaf)

		todayNoteLeaf.setViewState({
			...todayNoteLeaf.getViewState(),
		}, {focus: true})
	} else {
		await openPathInNewTab(app, todayPath)
	}
}

const openPathInNewTab = async (app: App, path: string) => {
	const file = app.vault.getAbstractFileByPath(path) as TFile
	// console.log('openPathInNewTab', file)
	const leaf = await openFile(app, file, {
		openInNewTab: true,
		direction: NewTabDirection.vertical,
		focus: true,
		mode: FileViewMode.default,
	})
	addTodayNoteClass(leaf)
}

export default class NewTabDailyPlugin extends Plugin {
	settings: PluginSettings;
	styleManager: StyleManger;

	async onload() {
		await this.loadSettings();
		const dailyNotesSettings = getDailyNotesSettings(this.app)
		this.styleManager = new StyleManger(this)
		this.styleManager.setStyle()

		// add sidebar button
		const ribbonIconEl = this.addRibbonIcon('calendar-with-checkmark', "Open today's daily note in new tab", async (evt: MouseEvent) => {
			await openTodayNoteInNewTab(this.app, this.settings, dailyNotesSettings);
			new Notice("Today's daily note opened");
		});

		// add command
		this.addCommand({
			id: 'open-todays-daily-note-in-new-tab',
			name: "Open today's daily note in new tab",
			callback: async () => {
				await openTodayNoteInNewTab(this.app, this.settings, dailyNotesSettings)
			}
		});

		// add settings tab
		this.addSettingTab(new SettingTab(this.app, this));
	}

	onunload() {
		this.styleManager.cleanup()
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SettingTab extends PluginSettingTab {
	plugin: NewTabDailyPlugin;

	constructor(app: App, plugin: NewTabDailyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const nowYMD = window.moment().format('yyyy-MM-DD')
		const yesterdayYMD = window.moment().subtract(1, 'day').format('yyyy-MM-DD')
		new Setting(containerEl)
			.setName('End of day time')
			.setDesc(`Determine today\'s date, if the value is 03:00 and the current datetime is ${nowYMD} 02:59, then the date for today is ${yesterdayYMD}`)
			.addText(text => text
				.setPlaceholder('HH:mm')
				.setValue(this.plugin.settings.endOfDayTime)
				.onChange(async (value) => {
					this.plugin.settings.endOfDayTime = value;
					await this.plugin.saveSettings();
				}
			));

		new Setting(containerEl)
			.setName('Always open new tab')
			.setDesc(`Set true to always open new tab even if the daily note is already opened, otherwise the plugin will try to find the existing daily note and focus on it`)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.alwaysOpenNewTab)
				.onChange(async (value) => {
					this.plugin.settings.alwaysOpenNewTab = value;
					await this.plugin.saveSettings();
				}
			));

		new Setting(containerEl)
			.setName('Background color')
			.setDesc(`Set background color for today's daily note`)
			.addText(text => text
				.setPlaceholder('RGB or Hex')
				.setValue(this.plugin.settings.backgroundColor)
				.onChange(async (value) => {
					this.plugin.settings.backgroundColor = value;
					await this.plugin.saveSettings();
					this.plugin.styleManager.setStyle();
				}
			));
	}
}


class StyleManger  {
	styleTag: HTMLStyleElement;
	plugin: NewTabDailyPlugin;

	constructor(plugin: NewTabDailyPlugin) {
		this.plugin = plugin
		this.styleTag = document.createElement('style')
		this.styleTag.id = 'today-note-style'
		document.getElementsByTagName("head")[0].appendChild(this.styleTag)
	}

	setStyle() {
		const { backgroundColor } = this.plugin.settings
		this.styleTag.innerText = `
			.workspace-leaf.is-today-note .view-header,
			.workspace-leaf.is-today-note .view-header > .view-actions {
				background-color: ${backgroundColor} !important;
			}

			.workspace-leaf.is-today-note .markdown-source-view {
				background-color: ${backgroundColor} !important;
			}
		`
			.trim()
      .replace(/[\r\n\s]+/g, " ")
	}

	cleanup() {
		this.styleTag.remove()
	}
}
