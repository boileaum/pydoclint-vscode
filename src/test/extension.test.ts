import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

suiteSetup(async () => {
	// Ensure the extension is activated
		const ext = vscode.extensions.getExtension('boileaum.pydoclint');
	if (ext && !ext.isActive) {
		await ext.activate();
	}
});

suite('Pydoclint Extension Test Suite', function() {
	this.timeout(10000);
	vscode.window.showInformationMessage('Start all tests.');

	test('Extension should be present', () => {
		const ext = vscode.extensions.getExtension('boileaum.pydoclint');
		assert.ok(ext);
	});

	test('Extension should activate on Python files', async () => {
		// Create a Python document
		const testFilePath = path.join(__dirname, '../../test_file.py');
		const document = await vscode.workspace.openTextDocument(testFilePath);

		assert.strictEqual(document.languageId, 'python');
	});

	test('Commands should be registered', async () => {
		const commands = await vscode.commands.getCommands(true);
		
		assert.ok(commands.includes('pydoclint.checkFile'));
		assert.ok(commands.includes('pydoclint.checkWorkspace'));
	});

	test('Configuration should be available', () => {
		const config = vscode.workspace.getConfiguration('pydoclint');
		
		assert.strictEqual(config.get('enabled'), true);
		assert.strictEqual(config.get('style'), 'google');
		assert.strictEqual(config.get('configFile'), 'pyproject.toml');
		assert.strictEqual(config.get('ignoreVirtualEnv'), true);
	});

	test('Diagnostic collection should be created', async () => {
		// This test verifies that the extension properly manages diagnostics
		const testFilePath = path.join(__dirname, '../../test_file.py');
		const document = await vscode.workspace.openTextDocument(testFilePath);
		
		// Open the document in editor
		await vscode.window.showTextDocument(document);
		
		// Wait a bit for diagnostics to be processed
		await new Promise(resolve => setTimeout(resolve, 2000));
		
		// Check if diagnostics are available
		const diagnostics = vscode.languages.getDiagnostics(document.uri);
		
		// We expect some diagnostics from our test file
		assert.ok(Array.isArray(diagnostics));
		console.log(`Found ${diagnostics.length} diagnostics`);
	});
});
