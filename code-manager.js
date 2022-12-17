const vscode = require('vscode')
const { writeFileSync, unlinkSync } = require('node:fs')
const pathlib = require('node:path')
const killProcess = require('tree-kill')
const { Utility } = require('./utility')

const { tmpdir, platform } = require('node:os')

class CodeManager {
	constructor() {
		this.outputChannel = vscode.window.createOutputChannel('VSC Code Runner')
		this.terminal = null
	}

	/**
	 * @param {string?} languageId
	 * @param {vscode.Uri?} uri
	 */
	run(languageId = null, uri = null) {
		function* generator() {
			if (this.running) {
				vscode.window.showInformationMessage('Code already running!')
				return
			}

			this.runFromExplorer = this.isExporer(uri)
			if (this.runFromExplorer) {
				this.document = yield vscode.workspace.openTextDocument(uri)
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
		return awaiter({ generator, thisObj: this })
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

		this.cwd ||= tmpdir()
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

	/** @param {vscode.Uri?} uri */
	isExplorer(uri) {
		return uri?.fsPath !== this.document?.uri.fsPath
	}

	onDidCloseTerminal() {
		this.terminal = null
	}
}

module.exports = { CodeManager }