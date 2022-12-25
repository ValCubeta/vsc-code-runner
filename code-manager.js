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

			this.config = this.getConfiguration('vsc-code-runner', this.document)
			this.cwd = this.config.get('cwd')
	
			this.workspaceFolder = this.getWorkspaceFolder()
	
			this.cwd ||= !this.workspaceFolder && this.document?.isUntitled
				? pathlib.dirname(this.document.fileName)
				: this.workspaceFolder
	
			this.cwd ||= tmpdir()

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
		if (this.running) {
			this.running = false
			vscode.commands.executeCommand('setContext', 'vsc-code-runner.running', false)
			killProcess(this.process.pid)
		}
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
			if (this.config.get('saveFileBeforeRun')) {
				return this.document.save()
					.then(() => {
						this.execute(executor, appendFile)
					})
			}
		} else {
			const text = (this.runFromExplorer || selection?.isEmpty || ignoreSelection)
				? this.document.getText()
				: this.document.getText(selection)
			this.isTmp = true
			const folder = this.document.isUntitled
				? this.cwd : pathlib.dirname(this.document.fileName)
			this.createFile(text, folder, extension)
		}
		this.execute(executor, appendFile)
	}

	createRandomFile(content, folder, fileExtension) {
		let fileType = "";
		const languageIdToFileExtensionMap = this._config.get("languageIdToFileExtensionMap");
		if (this._languageId && languageIdToFileExtensionMap[this._languageId]) {
			fileType = languageIdToFileExtensionMap[this._languageId];
		}
		else {
			if (fileExtension) {
				fileType = fileExtension;
			}
			else {
				fileType = "." + this._languageId;
			}
		}
		const temporaryFileName = this._config.get("temporaryFileName");
		const tmpFileNameWithoutExt = temporaryFileName ? temporaryFileName : "temp" + this.rndName();
		this.fileNameWithoutExt = tmpFileNameWithoutExt;
		const tmpFileName = tmpFileNameWithoutExt + fileType;
		this._codeFile = path_1.join(folder, tmpFileName);
		fs.writeFileSync(this._codeFile, content);
	}

	/** @param {vscode.Uri?} uri */
	isExplorer(uri) {
		return uri?.fsPath !== this.document?.uri.fsPath
	}

	deleteTerminal() {
		this.terminal = null
	}
}

module.exports = { CodeManager }