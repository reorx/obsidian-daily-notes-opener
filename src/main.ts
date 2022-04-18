/* TODO
 * - [x] add lumberjack functionality, allow adding new lines for the daily notes https://github.com/ryanjamurphy/lumberjack-obsidian
 * - [ ] add command to open specific files (static name files), customize icon. Then it'll be able to use Customize Sidebar plugin to add these commands to sidebar
 */
import {
	App, MarkdownView, Plugin, PluginSettingTab, Setting, TFile,
	WorkspaceLeaf,
} from 'obsidian'
import {
	IPeriodicNoteSettings, IGranularity, getDailyNoteSettings, createDailyNote,
	getPeriodicNoteSettings, createPeriodicNote,
} from 'obsidian-daily-notes-interface'

import { appendLine } from './appendline'
import {
	addTodayNoteClass, periodicNoteTypes, removeTodayNoteClass, StyleManger,
} from './styles'
import {
	FileViewMode, NewPaneDirection, openFile, DEBUG, debugLog,
} from './utils'
import { getNotePath } from './vault'

interface PluginSettings {
	endOfDayTime: string;
	alwaysOpenNewPane: boolean;
	periodicNotes: {
		[key: string]: {
			customizeBackground: boolean;
		}
	}
	appendLineTargetHeader: string;
	appendLinePrefix: string;
}


const DEFAULT_SETTINGS: PluginSettings = {
	endOfDayTime: '05:00',
	alwaysOpenNewPane: false,
	periodicNotes: {},
	appendLineTargetHeader: 'Journal',
	appendLinePrefix: '- {{DATE:HH:mm}} ',
}

for (const _type of periodicNoteTypes) {
	DEFAULT_SETTINGS.periodicNotes[_type] = {
		customizeBackground: true,
	}
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

const openOrCreateInNewPane = async (app: App, path: string, createFileFunc: () => Promise<TFile>, mode: FileViewMode) => {
	console.debug('openOrCreateInNewPane', path)
	let file = app.vault.getAbstractFileByPath(path) as TFile
	if (!(file instanceof TFile)) {
		debugLog('create today note:', path)
		file = await createFileFunc()
	}
	await openFile(app, file, {
		openInNewPane: true,
		direction: NewPaneDirection.vertical,
		focus: true,
		mode,
	})
}

const dateTmplRegex = /{{DATE:(.+)}}/gm

const replaceDateTmpl = (s: string, date: moment.Moment): string => {
	const m = dateTmplRegex.exec(s)
	if (!m) return s
	return s.replace(m[0], date.format(m[1]))
}

export default class DailyNotesNewPanePlugin extends Plugin {
	settings: PluginSettings
	cachedPeriodicNotes: { [key: string]: string} = {}
	styleManager: StyleManger

	getPeriodicType(path: string): IGranularity {
		for (const key in this.cachedPeriodicNotes) {
			if (this.cachedPeriodicNotes[key] === path) {
				return key as IGranularity
			}
		}
	}

	getAppendLinePrefix(): string {
		const now = window.moment()
		let prefix = this.settings.appendLinePrefix
		let newprefix = replaceDateTmpl(prefix, now)
		while (prefix !== newprefix) {
			prefix = newprefix
			newprefix = replaceDateTmpl(prefix, now)
		}
		return '\n' + prefix
	}

	async onload() {
		const pkg = require('../package.json')
		console.log(`Plugin loading: ${pkg.name} ${pkg.version}`)
		await this.loadSettings()
		this.styleManager = new StyleManger()
		this.setStyle()


		// Command: open-todays-daily-note-in-new-pane
		this.addCommand({
			id: 'open-todays-daily-note-in-new-pane',
			name: 'Open today\'s daily note in new pane',
			callback: async () => {
				await this.openTodayNoteInNewPane()
			}
		})
		this.addRibbonIcon('calendar-with-checkmark', 'Open today\'s daily note in new pane', async () => {
			await this.openTodayNoteInNewPane()
		})

		const openDailyNoteAndAppendLine = async () => {
			await this.openTodayNoteInNewPane()
			debugLog('done openTodayNoteInNewPane')

			// append line
			const view = this.app.workspace.getActiveViewOfType(MarkdownView)
			if (!view) {
				return
			}
			debugLog('call appendLine')
			appendLine(this.app, view, this.settings.appendLineTargetHeader, this.getAppendLinePrefix())
		}
		// Command: open-todays-daily-note-in-new-pane-append-line
		this.addCommand({
			id: 'open-todays-daily-note-in-new-pane-append-line',
			name: 'Open today\'s daily note in new pane and append line',
			callback: openDailyNoteAndAppendLine,
		})
		if (DEBUG) {
			this.addRibbonIcon('calendar-with-checkmark', 'Open today\'s daily note in new pane and append line', async () => { openDailyNoteAndAppendLine() })
		}

		// Command: open-todays-weekly-note-in-new-pane
		this.addCommand({
			id: 'open-todays-weekly-note-in-new-pane',
			name: 'Open today\'s weekly note in new pane',
			callback: () => {
				this.openTodayPeriodicNoteInNewPane('week')
			}
		})
		if (DEBUG) {
			this.addRibbonIcon('calendar-with-checkmark', 'Open today\'s weekly note in new pane', async () => {
				await this.openTodayPeriodicNoteInNewPane('week')
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
		this.addSettingTab(new SettingPane(this.app, this))
	}

	async openTodayNoteInNewPane() {
		const periodicSettings = getDailyNoteSettings()
		const [todayNotePath, todayTime] = getTodayNotePath(this.settings, periodicSettings)
		// update cachedPeriodicNotes so that event callback could use it
		this.cachedPeriodicNotes['day'] = todayNotePath

		await this.openInNewPane(todayNotePath, async () => {
			return createDailyNote(todayTime)
		}, this.settings.alwaysOpenNewPane)
		debugLog('done openInNewPane')
	}

	async openTodayPeriodicNoteInNewPane(type: IGranularity) {
		const periodicSettings = getPeriodicNoteSettings(type)
		const [todayNotePath, todayTime] = getTodayPeriodicNotePath(this.settings, periodicSettings)
		// update cachedPeriodicNotes so that event callback could use it
		this.cachedPeriodicNotes[type] = todayNotePath

		return this.openInNewPane(todayNotePath, async () => {
			return createPeriodicNote(type, todayTime)
		}, this.settings.alwaysOpenNewPane)
	}

	async openInNewPane(filePath: string, createFileFunc: () => Promise<TFile>, forceNewPane = false, mode: FileViewMode = FileViewMode.default) {
		if (forceNewPane) {
			await openOrCreateInNewPane(this.app, filePath, createFileFunc, mode)
			return
		}

		// try to find a existing pane, if multiple panes are open, only the last one will be used
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
			const { activeLeaf } = this.app.workspace
			if (activeLeaf && activeLeaf.view && activeLeaf.view.getViewType() === 'empty') {
				// if active view has no file opened, just open note in the active view
				const file = this.app.vault.getAbstractFileByPath(filePath) as TFile
				await activeLeaf.openFile(file)
				return
			}
			await openOrCreateInNewPane(this.app, filePath, createFileFunc, mode)
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
		const styledTypes: IGranularity[] = []
		for (const type in this.settings.periodicNotes) {
			if (this.settings.periodicNotes[type].customizeBackground) {
				styledTypes.push(type as IGranularity)
			}
		}
		this.styleManager.setStyle(styledTypes)
	}
}

class SettingPane extends PluginSettingTab {
	plugin: DailyNotesNewPanePlugin

	constructor(app: App, plugin: DailyNotesNewPanePlugin) {
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
			.setName('Always open new pane')
			.setDesc('Set true to always open new pane even if the daily note is already opened, otherwise the plugin will try to find the existing daily note and focus on it')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.alwaysOpenNewPane)
				.onChange(async (value) => {
					this.plugin.settings.alwaysOpenNewPane = value
					await this.plugin.saveSettings()
				}
				))

		new Setting(containerEl)
			.setName('Background colors')
			.setDesc('Daily notes new pane plugin adds support for colorizing today\'s periodic note, this functionality relies on another plugin called "Style Settings", please install and enable it so that you can adjust background colors for periodic notes')

		containerEl.createEl('h2', {text: 'Append line'})
		containerEl.createEl('div', {
			text: 'Control how "Append line" commands behave, note that this functionality is only avaliable for daily notes',
			attr: {
				style: `
					border: 1px solid #aaa;
					font-size: .8em;
					padding: 5px;
: 5px;				`
			}
		})

		new Setting(containerEl)
			.setName('Append line prefix')
			.setDesc('Set the prefix for lines added via "Append Line" command, only one template syntax is supported, which is "{{DATE:$FORMAT}}", the "$FORMAT" must be a Moment.js format, e.g. HH:mm')
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

		containerEl.createEl('h2', {text: 'Periodic notes'})
		containerEl.createEl('div', {
			text: 'Daily notes new pane plugin adds support for colorizing today\'s periodic note, this functionality relies on another plugin called "Style Settings", please install and enable it so that you can adjust background colors for periodic notes',
			attr: {
				style: `
					border: 1px solid #aaa;
					font-size: .8em;
					padding: 5px;
: 5px;				`
			}
		})

		containerEl.createEl('h3', {text: 'Daily'})
		new Setting(containerEl)
			.setName('Customize background color')
			.setDesc('Enable customize background color for daily notes in Style Settings')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.periodicNotes.day.customizeBackground)
				.onChange(async (value) => {
					this.plugin.settings.periodicNotes.day.customizeBackground = value
					await this.plugin.saveSettings()
					this.plugin.setStyle()
				}
				))

		containerEl.createEl('h3', {text: 'Weekly'})
		new Setting(containerEl)
			.setName('Customize background color')
			.setDesc('Enable customize background color for weekly notes in Style Settings')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.periodicNotes.week.customizeBackground)
				.onChange(async (value) => {
					this.plugin.settings.periodicNotes.week.customizeBackground = value
					await this.plugin.saveSettings()
					this.plugin.setStyle()
				}
				))
	}
}
