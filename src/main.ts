/* TODO
 * - [ ] add lumberjack functionality, allow adding new lines for the daily notes https://github.com/ryanjamurphy/lumberjack-obsidian
 * - [ ] add command to open specific files (static name files), customize icon. Then it'll be able to use Customize Sidebar plugin to add these commands to sidebar
 */
import {
	App, MarkdownView, Notice, Plugin, PluginSettingTab, Setting,
	TFile, WorkspaceLeaf,
} from 'obsidian'
import {
	IPeriodicNoteSettings, IGranularity, getDailyNoteSettings, createDailyNote,
	getPeriodicNoteSettings, createPeriodicNote,
} from 'obsidian-daily-notes-interface'

import { addTodayNoteClass, removeTodayNoteClass, StyleManger } from './styles'
import { FileViewMode, NewTabDirection, openFile } from './utils'
import { getNotePath } from './vault'

const DEBUG = !(process.env.BUILD_ENV === 'production')

function debugLog(...args: any[]) {
	if (DEBUG) {
		console.log(...args)
	}
}

interface PluginSettings {
	endOfDayTime: string;
	alwaysOpenNewTab: boolean;
	backgroundColor: string;
	backgroundColorDark: string;
}

const DEFAULT_SETTINGS: PluginSettings = {
	endOfDayTime: '05:00',
	alwaysOpenNewTab: false,
	backgroundColor: '#fefaea',
	backgroundColorDark: '#2d291f',
}

const getNowShifted = (settings: PluginSettings): moment.Moment => {
	const splited = settings.endOfDayTime.split(':').map(Number)
	if (splited.length !== 2) {
		throw new Error('Invalid end of day time format')
	}
	const now = window.moment()
	const shifted = now.clone().subtract(splited[0], 'hours').subtract(splited[1], 'minutes')
	debugLog('now', now.format('HH:mm'), 'shifted', shifted.format('HH:mm'))
	return shifted
}

const getTodayNotePath = (settings: PluginSettings, periodicSettings: IPeriodicNoteSettings): [string, moment.Moment] => {
	const { folder } = periodicSettings
	let { format } = periodicSettings
	if (!format) {
		format = 'yyyy-MM-DD'
	}
	const nowShifted = getNowShifted(settings)

	return [getNotePath(folder, nowShifted.format(format)), nowShifted]
}

const getTodayPeriodicNotePath = (settings: PluginSettings, periodicSettings: IPeriodicNoteSettings): [string, moment.Moment] => {
	const { folder, format } = periodicSettings
	if (!format) {
		throw new Error('Periodic note format is not defined')
	}
	const nowShifted = getNowShifted(settings)

	return [getNotePath(folder, nowShifted.format(format)), nowShifted]
}

const openOrCreateInNewTab = async (app: App, path: string, createFileFunc: () => Promise<TFile>, mode: FileViewMode) => {
	console.debug('openOrCreateInNewTab', path)
	let file = app.vault.getAbstractFileByPath(path) as TFile
	if (!(file instanceof TFile)) {
		debugLog('create today note:', path)
		file = await createFileFunc()
	}
	await openFile(app, file, {
		openInNewTab: true,
		direction: NewTabDirection.vertical,
		focus: true,
		mode,
	})
}

export default class DailyNotesNewTabPlugin extends Plugin {
	settings: PluginSettings
	styleManager: StyleManger
	noteCached: {
		path: string,
		type: IGranularity,
	}

	async onload() {
		const pkg = require('../package.json')
		console.log(`Plugin loading: ${pkg.name} ${pkg.version}`)
		await this.loadSettings()
		this.styleManager = new StyleManger()
		this.setStyle()

		// add sidebar button
		this.addRibbonIcon('calendar-with-checkmark', 'Open today\'s daily note in new tab', async (evt: MouseEvent) => {
			await this.openTodayNoteInNewTab()
			new Notice('Today\'s daily note opened')
		})
		if (DEBUG) {
			this.addRibbonIcon('calendar-with-checkmark', 'Open today\'s weekly note in new tab', async (evt: MouseEvent) => {
				await this.openTodayPeriodicNoteInNewTab('week')
				new Notice('Today\'s weekly note opened')
			})
		}

		// add command
		this.addCommand({
			id: 'open-todays-daily-note-in-new-tab',
			name: 'Open today\'s daily note in new tab',
			callback: async () => {
				await this.openTodayNoteInNewTab()
			}
		})
		this.addCommand({
			id: 'open-todays-weekly-note-in-new-tab',
			name: 'Open today\'s weekly note in new tab',
			callback: () => {
				this.openTodayPeriodicNoteInNewTab('week')
			}
		})

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
				if (file.path === this.noteCached.path) {
					addTodayNoteClass(view.leaf, this.noteCached.type)
				} else {
					removeTodayNoteClass(view.leaf)
				}
			})
		)

		// add settings tab
		this.addSettingTab(new SettingTab(this.app, this))
	}

	async openTodayNoteInNewTab() {
		const periodicSettings = getDailyNoteSettings()
		const [todayNotePath, todayTime] = getTodayNotePath(this.settings, periodicSettings)
		// update noteCached so that event callback could use it
		this.noteCached = {
			path: todayNotePath,
			type: 'day',
		}

		return this.openInNewTab(todayNotePath, async () => {
			return createDailyNote(todayTime)
		}, this.settings.alwaysOpenNewTab)
	}

	async openTodayPeriodicNoteInNewTab(type: IGranularity) {
		const periodicSettings = getPeriodicNoteSettings(type)
		const [todayNotePath, todayTime] = getTodayPeriodicNotePath(this.settings, periodicSettings)
		// update noteCached so that event callback could use it
		this.noteCached = {
			path: todayNotePath,
			type,
		}

		return this.openInNewTab(todayNotePath, async () => {
			return createPeriodicNote(type, todayTime)
		}, this.settings.alwaysOpenNewTab)
	}

	async openInNewTab(filePath: string, createFileFunc: () => Promise<TFile>, forceNewTab = false, mode: FileViewMode = FileViewMode.default) {
		if (forceNewTab) {
			await openOrCreateInNewTab(this.app, filePath, createFileFunc, mode)
			return
		}

		// try to find a existing tab, if multiple tabs are open, only the last one will be used
		let todayNoteLeaf: WorkspaceLeaf
		this.app.workspace.getLeavesOfType('markdown').forEach(leaf => {
			// check if leaf's file is today's note
			const { file } = leaf.view as MarkdownView
			if (file.path === filePath) {
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
			await openOrCreateInNewTab(this.app, filePath, createFileFunc, mode)
		}
	}

	onunload() {
		this.styleManager.cleanup()
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
	}

	async saveSettings() {
		await this.saveData(this.settings)
	}

	setStyle() {
		this.styleManager.setStyle({
			// compatibility
			day: {
				backgroundColor: this.settings.backgroundColor,
				backgroundColorDark: this.settings.backgroundColorDark
			}
		})
	}
}

class SettingTab extends PluginSettingTab {
	plugin: DailyNotesNewTabPlugin

	constructor(app: App, plugin: DailyNotesNewTabPlugin) {
		super(app, plugin)
		this.plugin = plugin
	}

	display(): void {
		const { containerEl } = this
		containerEl.empty()

		const nowYMD = window.moment().format('yyyy-MM-DD')
		const yesterdayYMD = window.moment().subtract(1, 'day').format('yyyy-MM-DD')
		new Setting(containerEl)
			.setName('End of day time')
			.setDesc(`Determine today's date, if the value is 03:00 and the current datetime is ${nowYMD} 02:59, then the date for today is ${yesterdayYMD}`)
			.addText(text => text
				.setPlaceholder('HH:mm')
				.setValue(this.plugin.settings.endOfDayTime)
				.onChange(async (value) => {
					this.plugin.settings.endOfDayTime = value
					await this.plugin.saveSettings()
				}
				))

		new Setting(containerEl)
			.setName('Always open new tab')
			.setDesc('Set true to always open new tab even if the daily note is already opened, otherwise the plugin will try to find the existing daily note and focus on it')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.alwaysOpenNewTab)
				.onChange(async (value) => {
					this.plugin.settings.alwaysOpenNewTab = value
					await this.plugin.saveSettings()
				}
				))

		new Setting(containerEl)
			.setName('Background color (light theme)')
			.setDesc('Set background color for today\'s daily note under light theme')
			.addText(text => text
				.setPlaceholder('RGB or Hex')
				.setValue(this.plugin.settings.backgroundColor)
				.onChange(async (value) => {
					this.plugin.settings.backgroundColor = value
					await this.plugin.saveSettings()
					this.plugin.setStyle()
				}
				))

		new Setting(containerEl)
			.setName('Background color (dark theme)')
			.setDesc('Set background color for today\'s daily note under dark theme')
			.addText(text => text
				.setPlaceholder('RGB or Hex')
				.setValue(this.plugin.settings.backgroundColorDark)
				.onChange(async (value) => {
					this.plugin.settings.backgroundColorDark = value
					await this.plugin.saveSettings()
					this.plugin.setStyle()
				}
				))
	}
}
