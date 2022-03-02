import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { TFile, WorkspaceLeaf, ViewState, normalizePath } from "obsidian";


interface PluginSettings {
	endOfDayTime: string;
	alwaysOpenNewTab: boolean;
}

const DEFAULT_SETTINGS: PluginSettings = {
	endOfDayTime: '05:00',
	alwaysOpenNewTab: false,
}

const getTodayNotePath = (settings: PluginSettings, dailyNotesSettings: any) => {
	let { folder, format } = dailyNotesSettings
	if (!format) {
		format = 'yyyy-MM-DD'
	}
	const splited = settings.endOfDayTime.split(':').map(Number)
	const now = window.moment()
	const shifted = now.subtract(splited[0], 'hours').subtract(splited[1], 'minutes')
	console.log('now', now, 'shifted', shifted)

	const todayPath = normalizePath(`${folder}/${shifted.format(format)}.md`);
	return todayPath
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
		const { file } = leaf.view
		if (file && file.path === todayPath) {
			todayNoteLeaf = leaf
			return
		}
	})

	if (todayNoteLeaf) {
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
	await openFile(app, file, {
		openInNewTab: true,
		direction: NewTabDirection.vertical,
		focus: true,
		mode: FileViewMode.default,
	})
}

export default class NewTabDailyPlugin extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();
		const dailyNotesSettings = this.app.internalPlugins.getPluginById('daily-notes').instance.options

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('calendar-with-checkmark', "Open today's daily note in new tab", async (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			await openTodayNoteInNewTab(this.app, this.settings, dailyNotesSettings);
			new Notice("Today's daily note opened");
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-today-daily-note-in-new-tab',
			name: "Open today's daily note in new tab",
			callback: async () => {
				await openTodayNoteInNewTab(this.app, this.settings, dailyNotesSettings)
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		/* TODO
		- ensure the new tab is the only daily note opened
		- day separator time
		*/

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
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Daily notes new tab settings'});

		const nowYMD = window.moment().format('yyyy-MM-DD')
		const yesterdayYMD = window.moment().subtract(1, 'day').format('yyyy-MM-DD')
		new Setting(containerEl)
			.setName('End of day time')
			.setDesc(`Determine today\'s date, if the value is 03:00 and the current datetime is ${nowYMD} 02:59, then the date for today is ${yesterdayYMD}`)
			.addText(text => text
				.setPlaceholder('HH:MM')
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
	}
}

enum FileViewMode {
	source = 'source', preview = 'preview', default = 'default'
}

enum NewTabDirection {
	vertical = "vertical", horizontal = "horizontal"
}

export async function openFile(app: App, file: TFile, optional?: {openInNewTab?: boolean, direction?: NewTabDirection, mode?: FileViewMode, focus?: boolean}) {
	let leaf: WorkspaceLeaf;

	if (optional?.openInNewTab && optional?.direction) {
			leaf = app.workspace.splitActiveLeaf(optional.direction);
	} else {
			leaf = app.workspace.getUnpinnedLeaf();
	}

	await leaf.openFile(file)

	if (optional?.mode || optional?.focus) {
			await leaf.setViewState({
					...leaf.getViewState(),
					state: optional.mode && optional.mode !== 'default' ? {...leaf.view.getState(), mode: optional.mode} : leaf.view.getState(),
					popstate: true,
			} as ViewState, { focus: optional?.focus });
	}
}
