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
{{prefix}} .view-header,
{{prefix}} .view-header > .view-actions,
{{prefix}} .workspace-leaf-header,
{{prefix}}.workspace-leaf.mod-active .view-header,
.workspace-split.mod-root>{{prefix}}.workspace-leaf:first-of-type:last-of-type .view-header
{
	{{backgroundCss}}
}

{{prefix}} .markdown-source-view,
{{prefix}} .markdown-reading-view {
	{{backgroundCss}}
}

{{prefix}} .CodeMirror-gutter.CodeMirror-linenumbers,
{{prefix}} .CodeMirror-gutter.CodeMirror-foldgutter {
	{{backgroundCss}}
}
`

export class StyleManger  {
	styleTag: HTMLStyleElement

	constructor() {
		this.styleTag = document.head.createEl('style')
		this.styleTag.id = 'daily-notes-opener-style'
	}

	makePeriodicNoteStyles(type: IGranularity): string {
		return renderTemplate(periodicNoteStylesTmpl, {
			type,
			// prefix class is by the side of .workspace-leaf
			prefix: `.periodic-note-${type}`,
			backgroundCss: `background-color: var(--dno-${type}-background) !important;`
		})
	}

	setStyle(types: IGranularity[]) {
		let text = ''
		for (const type of types) {
			text += this.makePeriodicNoteStyles(type)
		}
		// debugLog('setStyle', text)
		this.styleTag.innerText = text.trim().replace(/[\r\n\s]+/g, ' ')
	}

	cleanup() {
		this.styleTag.remove()
	}
}
