const fs = require('node:fs')
const os = require('node:os')
const pathlib = require('node:path')
const vscode = require('vscode')
const killProcess = require('tree-kill')
const constants = require('./constants')
const { Utility } = require('./utility')
const tmpDir = os.tmpdir()

class CodeManager {
	constructor() {
		this.outputChannel = vscode.window.createOutputChannel('VSC Code Runner')
		this.terminal = null
	}

	/**
	 * @param {string?} languageId
	 * @param {vscode.Uri?} fileUri
	 */
	run(languageId = null, fileUri = null) {
		function* generator() {
			if (this.running) {
				vscode.window.showInformationMessage('Code already running!')
				return
			}

			this.runFromExplorer = this.checkIsRunFromExplorer(fileUri)
			if (this.runFromExplorer) {
				this.document = yield vscode.workspace.openTextDocument(fileUri)
			} else {
				const editor = vscode.window.activeTextEditor
				if (!editor) {
					vscode.window.showInformationMessage('No code found or selected!')
					return
				}
				this.document = editor.document
			}
			this.initialize()

			const extension = pathlib.extname(this.document.fileName)
			const executor = this.getExecutor(languageId, extension)
	
			if (!executor) {
				vscode.window.showInformationMessage('Language not supported or defined')
				return
			}

			this.getCodeFileAndExecute(extension, executor)
		}
		return awaiter({ thisObj: this, generator })
	}

	stop() {
		this.stopRunning()
	}

	dispose() {
		this.stopRunning()
	}

	stopRunning() {
		if (this.running) {
			this.running = false
			vscode.commands.executeCommand('setContext', 'vsc-code-runner.running', false)
			killProcess(this.process.pid)
		}
	}

	initialize() {
		this.config = Utility.getConfiguration('vsc-code-runner', this.document)
		this.cwd = this.config.get('cwd')

		this.workspaceFolder = this.getWorkspaceFolder()

		this.cwd ||= !this.workspaceFolder && this.document?.isUntitled
			? pathlib.dirname(this.document.fileName)
			: this.workspaceFolder

		this.cwd ||= tmpDir
	}

	getWorkspaceFolder() {
		if (vscode.workspace.workspaceFolders) {
			if (this.document) {
				const workspaceFolder = vscode.workspace.getWorkspaceFolder(this.document.uri);
				if (workspaceFolder) {
					return workspaceFolder.uri.fsPath;
				}
			}
			return vscode.workspace.workspaceFolders[0].uri.fsPath;
		}
	}

	getFileAndExecute(extension, executor, appendFile = true) {
		let selection;
		const activeTextEditor = vscode.window.activeTextEditor
		if (activeTextEditor) {
			selection = activeTextEditor.selection
		}
		const ignoreSelection = this.config.get('ignoreSelection')
		if ((this.runFromExplorer || selection?.isEmpty || ignoreSelection) && !this.document.isUntitled) {
			this.isTmp = false
			this.file = this.document.fileName
			if (this._config.get('saveFileBeforeRun')) {
				return this.document.save().then(() => {
					this.executeCommand(executor, appendFile)
				})
			}
		} else {
			let text = (this._runFromExplorer || selection?.isEmpty || ignoreSelection)
				? this.document.getText()
				: this.document.getText(selection)
			this.isTmp = true
			const folder = this.document.isUntitled
				? this.cwd : pathlib.dirname(this.document.fileName)
			this.createRandomFile(text, folder, extension)
		}
		this.executeCommand(executor, appendFile)
	}

	/**
	 * @param {vscode.Uri} fileUri File Uri
	 */
	checkIsRunFromExplorer(fileUri) {
		return fileUri?.fsPath !== vscode.window.activeTextEditor?.document.uri.fsPath
	}

	onDidCloseTerminal() {
		this.terminal = null
	}
}

function awaiter({ thisObj, args, generator }) {
	function adopt(value) {
		if (value instanceof Promise) {
			return value
		}
		return Promise.resolve(value)
	}

	
	return new Promise((resolve, reject) => {
		function handler({ fulfilled }) {
			try {
				if (fulfilled) {
					step(generator.next(value))
					return
				}
				step(generator.throw(value))
			} catch (error) {
				reject(error)
			}
		}

		function step(result) {
			if (result.done) {
				resolve(result.value)
				return
			}
			adopt(result.value).then(
				() => handler({ fulfilled: true  }),
				() => handler({ fulfilled: false })
			)
		}
		step(generator.apply(thisObj, args ?? []).next())
	})
}

module.exports = { CodeManager }