import { App, TFile, ViewState, WorkspaceLeaf } from 'obsidian'

export enum FileViewMode {
	source = 'source', preview = 'preview', default = 'default'
}

export enum NewTabDirection {
	vertical = 'vertical', horizontal = 'horizontal'
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
export async function openFile(app: App, file: TFile, optional?: {openInNewTab?: boolean, direction?: NewTabDirection, mode?: FileViewMode, focus?: boolean}): Promise<WorkspaceLeaf> {
	let leaf: WorkspaceLeaf

	if (optional?.openInNewTab && optional?.direction) {
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

class ExtendedLeaf extends WorkspaceLeaf {
	containerEl: HTMLElement
}

export function getContainerElfromLeaf(leaf: WorkspaceLeaf): HTMLElement {
	const extendedLeaf = leaf as ExtendedLeaf
	return extendedLeaf.containerEl
}
