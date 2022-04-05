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
