/* Copy from https://github.com/ryanjamurphy/lumberjack-obsidian */
import { App, Editor, HeadingCache, MarkdownView } from 'obsidian'

export const appendLine = (app: App, view: MarkdownView, targetHeader: string, linePrefix: string) => {
	const editor = view.editor
	// Make sure the editor has focus
	editor.focus()

	// Inserting the cursor
	// The goal is to set the cursor either at the end of the user's target section, if set, or at the end of the note

	let positionFound = false
	// find the section to insert the log item into and set the insert position to append into it, or set the insert position to the end of the note
	const sections = app.metadataCache.getFileCache(view.file).headings
	console.log('sections', sections)
	if (sections && targetHeader) {
		// need to figure out which line the _next_ section is on, if any, then use that line number in the functions below
		const targetSection = sections.find((eachSection) => (eachSection.heading === targetHeader)) // does the heading we're looking for exist?
		if (typeof targetSection !== undefined) { // The target section exists
			const nextSection = sections.find((eachSection) => ((eachSection.position.start.line > targetSection.position.start.line) && (eachSection.level <= targetSection.level))) // matches sections _after_ our target, with the same level or greater
			console.log(nextSection)
			if (typeof nextSection !== undefined) { // The search for a following section did not return undefined, therefore it exists
				positionFound = true
				appendInTargetSection(editor, linePrefix, targetSection, nextSection)
			} else {
				// There is no section following the target section. Look for the end of the document
				// A better approach would append the item at the end of the content inside the user's target section, because it's possible that someone would put more stuff in their daily note without a following section, but that will have to be implemented later.
				console.log('No section follows the target section. Inserting the log item at the end of the target section.')
			}
		}
	}

	if (!positionFound) {
		console.log('no position found, append to the bottom')
		// The daily note does not have sections, or the user has not set a target header,
		// or the section just cannot be found.
		// Insert the log item at the bottom of the note.
		editor.setCursor(editor.lastLine())
		editor.replaceSelection(linePrefix)
		editor.setCursor(editor.lastLine())
	}
}

function appendInTargetSection(editor: Editor, linePrefix: string, targetSection: HeadingCache, nextSection: HeadingCache) {
	// Find out if there is a preceding blank line before the next section. E.g., does the user use linebreaks to separate content in edit mode? If so, inserting the next item after that line break will look messy.

	if (editor.getLine(nextSection.position.start.line - 1) === editor.getLine(targetSection.position.start.line)) {
		// There are no lines between the next section and the target section. Insert the log item immediately after the target section.
		editor.setCursor(nextSection.position.start.line - 1)
		editor.replaceSelection(linePrefix)
		editor.setCursor(nextSection.position.start.line)
	} else if (editor.getLine(nextSection.position.start.line - 1).length > 0) {
		// The line just before the next section header is not blank. Insert the log item just before the next section, without a line break.
		console.log('No blank lines found between the target section and the next section.')
		editor.setCursor(nextSection.position.start.line - 2)
		editor.replaceSelection(linePrefix)
		editor.setCursor(nextSection.position.start.line)
	} else {
		console.log(`The line before the next section has 0 length. It is line number: ${nextSection.position.start.line - 1}`)
		// The line just before the next section header is blank. It's likely that the user uses line breaks to clean up their note in edit mode.
		// The approach here is to iterate over the lines preceding the next section header until a non-blank line is reached, then insert the log item at (iterator.position.start.line + 1)...
		let lastBlankLineFound = false
		let noBlankLines = false
		let lastLineBeforeLineBreakIteratorLineNumber = nextSection.position.start.line - 1 // `lastLineBeforeLineBreakIteratorNumber: this wordy variable represents the number of the last-line-before-line-break iterator's current line
		while (lastBlankLineFound == false) {
			if (lastLineBeforeLineBreakIteratorLineNumber == 0) { // This condition would mean the iterator found the start of the document
				noBlankLines = true
				lastBlankLineFound = true
			} else {
				const blankLineFinderCurrentLine = editor.getLine(lastLineBeforeLineBreakIteratorLineNumber)
				if (blankLineFinderCurrentLine.toString() === '') {
					lastBlankLineFound = true
					console.log('found the last line')
				} else {
					lastLineBeforeLineBreakIteratorLineNumber = lastLineBeforeLineBreakIteratorLineNumber - 1 // Move to the next line up
				}
			}
		}

		if (noBlankLines) { // this means the iterator failed to find any blanks at all; insert the log item just before the next section.
			console.log('No blank lines found.')
			editor.setCursor(nextSection.position.start.line - 1)
			editor.replaceSelection(linePrefix)
			editor.setCursor(nextSection.position.start.line - 1)
		} else { // There were an arbitrary number of blank lines before the next section header. Insert the log item _after_ the last (length > 0) line before the next section header.
			console.log(`Iterator stopped at line ${lastLineBeforeLineBreakIteratorLineNumber}, with text ${editor.getLine(lastLineBeforeLineBreakIteratorLineNumber)}`)
			editor.setCursor(lastLineBeforeLineBreakIteratorLineNumber - 1)
			editor.replaceSelection(linePrefix)
			editor.setCursor(lastLineBeforeLineBreakIteratorLineNumber)
		}
	}
}
