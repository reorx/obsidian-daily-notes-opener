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

import { appendLine } from './appendline'
import { addTodayNoteClass, removeTodayNoteClass } from './styles'
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
	appendLineTargetHeader: string;
	appendLinePrefix: string;
}

const DEFAULT_SETTINGS: PluginSettings = {
	endOfDayTime: '05:00',
	alwaysOpenNewTab: false,
	appendLineTargetHeader: 'Journal',
	appendLinePrefix: '- HH:mm ',
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
	cachedPeriodicNotes: { [key: string]: string} = {}

	getPeriodicType(path: string): IGranularity {
		for (const key in this.cachedPeriodicNotes) {
			if (this.cachedPeriodicNotes[key] === path) {
				return key as IGranularity
			}
		}
	}

	getAppendLinePrefix(): string {
		return '\n' + window.moment().format(this.settings.appendLinePrefix)
	}

	async onload() {
		const pkg = require('../package.json')
		console.log(`Plugin loading: ${pkg.name} ${pkg.version}`)
		await this.loadSettings()


		// add command
		this.addCommand({
			id: 'open-todays-daily-note-in-new-tab',
			name: 'Open today\'s daily note in new tab',
			callback: async () => {
				await this.openTodayNoteInNewTab()
			}
		})
		// add sidebar button
		this.addRibbonIcon('calendar-with-checkmark', 'Open today\'s daily note in new tab', async (evt: MouseEvent) => {
			await this.openTodayNoteInNewTab()
			new Notice('Today\'s daily note opened')
		})

		const openDailyNoteAndAppendLine = async () => {
			await this.openTodayNoteInNewTab()
			debugLog('done openTodayNoteInNewTab')

			// append line
			const view = this.app.workspace.getActiveViewOfType(MarkdownView)
			if (!view) {
				return
			}
			debugLog('call appendLine')
			appendLine(this.app, view, this.settings.appendLineTargetHeader, this.getAppendLinePrefix())
		}
		this.addCommand({
			id: 'open-todays-daily-note-in-new-tab-append-line',
			name: 'Open today\'s daily note in new tab and append line',
			callback: openDailyNoteAndAppendLine,
		})
		if (DEBUG) {
			this.addRibbonIcon('calendar-with-checkmark', 'Open today\'s daily note in new tab and append line', async (evt: MouseEvent) => { openDailyNoteAndAppendLine() })
		}

		this.addCommand({
			id: 'open-todays-weekly-note-in-new-tab',
			name: 'Open today\'s weekly note in new tab',
			callback: () => {
				this.openTodayPeriodicNoteInNewTab('week')
			}
		})
		if (DEBUG) {
			this.addRibbonIcon('calendar-with-checkmark', 'Open today\'s weekly note in new tab', async (evt: MouseEvent) => {
				await this.openTodayPeriodicNoteInNewTab('week')
				new Notice('Today\'s weekly note opened')
			})
		}

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
				const type = this.getPeriodicType(file.path)
				if (type) {
					addTodayNoteClass(view.leaf, type)
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
		// update cachedPeriodicNotes so that event callback could use it
		this.cachedPeriodicNotes['day'] = todayNotePath

		await this.openInNewTab(todayNotePath, async () => {
			return createDailyNote(todayTime)
		}, this.settings.alwaysOpenNewTab)
		debugLog('done openInNewTab')
	}

	async openTodayPeriodicNoteInNewTab(type: IGranularity) {
		const periodicSettings = getPeriodicNoteSettings(type)
		const [todayNotePath, todayTime] = getTodayPeriodicNotePath(this.settings, periodicSettings)
		// update cachedPeriodicNotes so that event callback could use it
		this.cachedPeriodicNotes[type] = todayNotePath

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
				if (!this.getPeriodicType(file.path))
					removeTodayNoteClass(leaf)
			}
		})

		if (todayNoteLeaf) {
			await todayNoteLeaf.setViewState({
				...todayNoteLeaf.getViewState(),
			}, { focus: true })
		} else {
			await openOrCreateInNewTab(this.app, filePath, createFileFunc, mode)
		}
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
	}

	async saveSettings() {
		await this.saveData(this.settings)
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

		containerEl.createEl('h2', {text: 'General'})
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
			.setName('Background colors')
			.setDesc('Daily notes new tab plugin adds support for colorizing today\'s periodic note, this functionality relies on another plugin called "Style Settings", please install and enable it so that you can adjust background colors for periodic notes')

		containerEl.createEl('h2', {text: 'Append Line'})

		new Setting(containerEl)
			.setName('Append line prefix')
			.setDesc('Set the prefix for lines added via "Append Line" command, Moment.js syntax is supported.')
			.addText(text => text
				.setPlaceholder('- HH:mm')
				.setValue(this.plugin.settings.appendLinePrefix)
				.onChange(async (value) => {
					this.plugin.settings.appendLinePrefix = value
					await this.plugin.saveSettings()
				}
				))

		new Setting(containerEl)
			.setName('Append line target header')
			.setDesc('If set, the new line will be appended to the content of target header.')
			.addText(text => text
				.setPlaceholder('Journal')
				.setValue(this.plugin.settings.appendLineTargetHeader)
				.onChange(async (value) => {
					this.plugin.settings.appendLineTargetHeader = value
					await this.plugin.saveSettings()
				}
				))
	}
}
