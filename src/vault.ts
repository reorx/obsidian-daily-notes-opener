/* Copy from https://github.com/liamcain/obsidian-daily-notes-interface/blob/main/src/vault.ts

MIT License

Copyright (c) 2021 Liam Cain

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
*/

import { normalizePath } from 'obsidian'

// Credit: @creationix/path.js
export function join(...partSegments: string[]): string {
	// Split the inputs into a list of path commands.
	let parts: string[] = []
	for (let i = 0, l = partSegments.length; i < l; i++) {
		parts = parts.concat(partSegments[i].split('/'))
	}
	// Interpret the path commands to get the new resolved path.
	const newParts = []
	for (let i = 0, l = parts.length; i < l; i++) {
		const part = parts[i]
		// Remove leading and trailing slashes
		// Also remove "." segments
		if (!part || part === '.') continue
		// Push new path segments.
		else newParts.push(part)
	}
	// Preserve the initial slash if there was one.
	if (parts[0] === '') newParts.unshift('')
	// Turn back into a single string path.
	return newParts.join('/')
}

export function getNotePath(
	directory: string,
	filename: string
):string {
	if (!filename.endsWith('.md')) {
		filename += '.md'
	}
	return normalizePath(join(directory, filename))
}
