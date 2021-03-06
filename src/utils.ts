import { App, TFile, ViewState, WorkspaceLeaf } from 'obsidian'

export const DEBUG = !(process.env.BUILD_ENV === 'production')

export function debugLog(...args: any[]) {
	if (DEBUG) {
		console.log((new Date()).toISOString().slice(11, 23), ...args)
	}
}

class ExtendedLeaf extends WorkspaceLeaf {
	containerEl: HTMLElement
}

export function getContainerElfromLeaf(leaf: WorkspaceLeaf): HTMLElement {
	const extendedLeaf = leaf as ExtendedLeaf
	return extendedLeaf.containerEl
}

// eslint-disable-next-line
export function renderTemplate(tmpl: string, data: any) {
	for (const key in data) {
		tmpl = tmpl.replace(new RegExp(`{{${key}}}`, 'g'), data[key])
	}
	return tmpl
}

// Copy from https://github.com/chhoumann/quickadd src/utility.ts
/*
MIT License

Copyright (c) 2021 Christian Bager Bach Houmann

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
*/

export enum FileViewMode {
	source = 'source', preview = 'preview', default = 'default'
}

export enum NewPaneDirection {
	vertical = 'vertical', horizontal = 'horizontal'
}

export async function openFile(app: App, file: TFile, optional?: {openInNewPane?: boolean, direction?: NewPaneDirection, mode?: FileViewMode, focus?: boolean}): Promise<WorkspaceLeaf> {
	let leaf: WorkspaceLeaf

	if (optional?.openInNewPane && optional?.direction) {
		leaf = app.workspace.splitActiveLeaf(optional.direction)
	} else {
		leaf = app.workspace.getUnpinnedLeaf()
	}

	await leaf.openFile(file)

	if (optional?.mode || optional?.focus) {
		const viewState = leaf.getViewState()
		await leaf.setViewState({
			...viewState,
			state: optional.mode && optional.mode !== 'default'
				? {
					...viewState.state,
					mode: optional.mode,
				}
				: viewState.state,
			popstate: true,
		} as ViewState, { focus: optional?.focus })
	}
	return leaf
}
