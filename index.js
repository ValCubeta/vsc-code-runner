const vscode = require('vscode')
const { CodeManager } = require('./code-manager.js')

function activate(context) {
	const codeManager = new CodeManager()

	vscode.window.onDidCloseTerminal(() => {
		codeManager.onDidCloseTerminal()
	})

	const run = vscode.commands.registerCommand('vsc-code-runner.run', fileUri => {
		codeManager.run(null, fileUri)
	})

	const stop = vscode.commands.registerCommand('vsc-code-runner.stop', () => {
		codeManager.stop()
	})

	context.subscriptions.push(run, stop)
}

module.exports = { activate }