import { WorkspaceLeaf } from 'obsidian'
import { IGranularity } from 'obsidian-daily-notes-interface'

import { getContainerElfromLeaf, renderTemplate } from './utils'

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

const periodicNoteStylesTmpl = `/* style for {{type}} type */
.periodic-note-{{type}} .view-header,
.periodic-note-{{type}} .view-header > .view-actions {
	background-color: var(--dnnt-{{type}}-background) !important;
}

.periodic-note-{{type}} .markdown-source-view,
.periodic-note-{{type}} .markdown-reading-view {
	background-color: var(--dnnt-{{type}}-background) !important;
}

.periodic-note-{{type}} .CodeMirror-gutter.CodeMirror-linenumbers,
.periodic-note-{{type}} .CodeMirror-gutter.CodeMirror-foldgutter {
	background-color: var(--dnnt-{{type}}-background) !important;
}
`

export class StyleManger  {
	styleTag: HTMLStyleElement

	constructor() {
		this.styleTag = document.head.createEl('style')
		this.styleTag.id = 'daily-notes-new-tab-style'
	}

	makePeriodicNoteStyles(type: IGranularity): string {
		return renderTemplate(periodicNoteStylesTmpl, { type })
	}

	setStyle(types: IGranularity[]) {
		let text = ''
		for (const type of types) {
			text += this.makePeriodicNoteStyles(type)
		}
		console.log('setStyle', text)
		this.styleTag.innerText = text.trim().replace(/[\r\n\s]+/g, ' ')
	}

	cleanup() {
		this.styleTag.remove()
	}
}
