import * as doT from 'dot'
import { WorkspaceLeaf } from 'obsidian'
import { IGranularity } from 'obsidian-daily-notes-interface'

import { getContainerElfromLeaf } from './utils'

export const periodicNoteTypes: IGranularity[] = ['day', 'week']
export const themes = ['light', 'dark']

export const periodicNoteClass = (type: IGranularity): string => {
	return `periodic-note-${type}`
}

export const addTodayNoteClass = (leaf: WorkspaceLeaf, type: IGranularity) => {
	const el = getContainerElfromLeaf(leaf)
	el.addClass(periodicNoteClass(type))
}

export const removeTodayNoteClass = (leaf: WorkspaceLeaf) => {
	const el = getContainerElfromLeaf(leaf)
	for (const type of periodicNoteTypes) {
		el.removeClass(periodicNoteClass(type))
	}
}

export interface Styles {
	backgroundColor: string;
	backgroundColorDark: string;
}

export interface PeriodicNoteStyles {
	[type: string]: Styles
}

const dotSettings: Partial<doT.TemplateSettings> = {
	argName: 'o',
	strip: false,
}

const periodicNoteStyleTmpl = doT.template(`
{{=o.prefix}} .view-header,
{{=o.prefix}} .view-header > .view-actions {
	background-color: {{=o.backgroundColor}} !important;
}

{{=o.prefix}} .markdown-source-view,
{{=o.prefix}} .markdown-reading-view {
	background-color: {{=o.backgroundColor}} !important;
}

{{=o.prefix}} .CodeMirror-gutter.CodeMirror-linenumbers,
{{=o.prefix}} .CodeMirror-gutter.CodeMirror-foldgutter {
	background-color: {{=o.backgroundColor}} !important;
}
`, dotSettings)

export class StyleManger  {
	styleTag: HTMLStyleElement

	constructor() {
		this.styleTag = document.head.createEl('style')
		this.styleTag.id = 'daily-notes-new-tab-style'
	}

	makePeriodicNoteStyle(type: IGranularity, theme: string, styles: Styles): string {
		const backgroundColor = theme === 'light' ? styles.backgroundColor : styles.backgroundColorDark
		return periodicNoteStyleTmpl({
			prefix: `.theme-${theme}.workspace-leaf.${periodicNoteClass(type)}`,
			backgroundColor,
		})
	}

	setStyle(styles: PeriodicNoteStyles) {
		let text = ''
		for (const theme of themes) {
			for (const type of periodicNoteTypes) {
				const typeStyles = styles[type]
				if (typeStyles) {
					text += `/* theme=${theme} type=${type} */\n`
					text += this.makePeriodicNoteStyle(type, theme, styles[type])
				}
			}
		}
		console.log('setStyle', text)
		this.styleTag.innerText = text.trim().replace(/[\r\n\s]+/g, ' ')
	}

	cleanup() {
		this.styleTag.remove()
	}
}
