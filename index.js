const vscode = require('vscode')
const { CodeManager } = require('./code-manager.js')

function activate(context) {
	const manager = new CodeManager()

	
	const run = vscode.commands.registerCommand('vsc-code-runner.run', uri => {
		manager.run(null, uri)
	})

	vscode.window.onDidCloseTerminal(manager.deleteTerminal)
	
	const stop = vscode.commands.registerCommand('vsc-code-runner.stop', manager.stop)
	
	context.subscriptions.push(run, stop)

	vscode.window.showInformationMessage('Code Runner activated')
}

function deactivate() {}

module.exports = { activate, deactivate }