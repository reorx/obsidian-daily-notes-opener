import {
	App, Notice, Plugin, PluginSettingTab, Setting,
	TFile, WorkspaceLeaf, MarkdownView,
} from 'obsidian';
import {
	openFile, NewTabDirection, FileViewMode,
	getContainerElfromLeaf, StyleManger,
} from './utils'
import { createDailyNote, getDailyNoteSettings, IPeriodicNoteSettings } from 'obsidian-daily-notes-interface'

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

const getTodayNotePath = (settings: PluginSettings, dailyNotesSettings: IPeriodicNoteSettings): [string, moment.Moment] => {
	let { folder, format } = dailyNotesSettings
	if (!format) {
		format = 'yyyy-MM-DD'
	}
	const splited = settings.endOfDayTime.split(':').map(Number)
	if (splited.length !== 2) {
		throw new Error('Invalid end of day time format')
	}
	const now = window.moment()
	const shifted = now.clone().subtract(splited[0], 'hours').subtract(splited[1], 'minutes')
	// console.log('now', now.format('HH:mm'), 'shifted', shifted.format('HH:mm'))

	let path = `${shifted.format(format)}.md`
	if (folder) {
		path = `${folder}/${shifted.format(format)}.md`
	}
	return [path, shifted]
}

const TODAY_NOTE_CLASS = 'is-today-note'

const addTodayNoteClass = (leaf: WorkspaceLeaf) => {
	const el = getContainerElfromLeaf(leaf)
	el.addClass(TODAY_NOTE_CLASS)
}

const removeTodayNoteClass = (leaf: WorkspaceLeaf) => {
	const el = getContainerElfromLeaf(leaf)
	el.removeClass(TODAY_NOTE_CLASS)
}


const openOrCreateInNewTab = async (app: App, path: string, time: moment.Moment) => {
	console.debug('openOrCreateInNewTab', path, time)
	let file = app.vault.getAbstractFileByPath(path) as TFile
	if (!(file instanceof TFile)) {
		console.log('create today note:', path)
		file = await createDailyNote(time)
	}
	await openFile(app, file, {
		openInNewTab: true,
		direction: NewTabDirection.vertical,
		focus: true,
		mode: FileViewMode.default,
	})
}

export default class DailyNotesNewTabPlugin extends Plugin {
	settings: PluginSettings;
	styleManager: StyleManger;
	todayNotePathCached: string;

	async onload() {
		const pkg = require('./package.json')
		console.log(`Plugin loading: ${pkg.name} ${pkg.version}`)
		await this.loadSettings();
		this.styleManager = new StyleManger()
		this.setStyle()

		// add sidebar button
		this.addRibbonIcon('calendar-with-checkmark', "Open today's daily note in new tab", async (evt: MouseEvent) => {
			await this.openTodayNoteInNewTab();
			new Notice("Today's daily note opened");
		});

		// add command
		this.addCommand({
			id: 'open-todays-daily-note-in-new-tab',
			name: "Open today's daily note in new tab",
			callback: async () => {
				await this.openTodayNoteInNewTab()
			}
		});

		// register event
		this.registerEvent(
			this.app.workspace.on('file-open', () => {
				// check if active leaf is still today's note
				const view = this.app.workspace.getActiveViewOfType(MarkdownView)
				if (!view) {
					return
				}

				// add or remove today note class according to the file
				const { file } = view
				if (file.path === this.todayNotePathCached) {
					addTodayNoteClass(view.leaf)
				} else {
					removeTodayNoteClass(view.leaf)
				}
			})
		)

		// add settings tab
		this.addSettingTab(new SettingTab(this.app, this));
	}

	async openTodayNoteInNewTab() {
		const dailyNotesSettings = getDailyNoteSettings()
		const [todayNotePath, todayTime] = getTodayNotePath(this.settings, dailyNotesSettings)
		// update todayNotePathCached so that event callback could use it
		this.todayNotePathCached = todayNotePath

		if (this.settings.alwaysOpenNewTab) {
			await openOrCreateInNewTab(this.app, todayNotePath, todayTime)
			return
		}

		// try to find a existing tab, if multiple tabs are open, only the last one will be used
		var todayNoteLeaf: WorkspaceLeaf
		this.app.workspace.getLeavesOfType('markdown').forEach(leaf => {
			// check if leaf's file is today's note
			const { file } = leaf.view as MarkdownView
			if (file.path === todayNotePath) {
				todayNoteLeaf = leaf
			} else {
				removeTodayNoteClass(leaf)
			}
		})

		if (todayNoteLeaf) {
			todayNoteLeaf.setViewState({
				...todayNoteLeaf.getViewState(),
			}, { focus: true })
		} else {
			await openOrCreateInNewTab(this.app, todayNotePath, todayTime)
		}
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

	setStyle() {
		this.styleManager.setStyle({
			backgroundColor: this.settings.backgroundColor,
		})
	}
}

class SettingTab extends PluginSettingTab {
	plugin: DailyNotesNewTabPlugin;

	constructor(app: App, plugin: DailyNotesNewTabPlugin) {
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
					this.plugin.setStyle();
				}
				));
	}
}
