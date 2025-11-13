import * as vscode from 'vscode';
import * as path from 'path';
// minimatch exports a function; use require to get a callable reference
const minimatch = require('minimatch');
import { spawn } from 'child_process';
import * as fs from 'fs';

interface PydoclintError {
	file: string;
	line: number;
	code: string;
	message: string;
}

export function activate(context: vscode.ExtensionContext) {
	console.log('Pydoclint extension is now active!');

	// Create diagnostic collection
	const diagnosticCollection = vscode.languages.createDiagnosticCollection('pydoclint');
	context.subscriptions.push(diagnosticCollection);

	// Register commands
	const checkFileCommand = vscode.commands.registerCommand('pydoclint.checkFile', () => {
		console.log('Pydoclint: checkFile command triggered');
		const activeEditor = vscode.window.activeTextEditor;
		if (activeEditor && activeEditor.document.languageId === 'python') {
			console.log('Pydoclint: Checking Python file:', activeEditor.document.fileName);
			vscode.window.setStatusBarMessage('Pydoclint: Checking current Python file...', 3000);
			checkPythonFile(activeEditor.document, diagnosticCollection);
		} else {
			console.log('Pydoclint: No Python file open');
			vscode.window.showWarningMessage('Please open a Python file to check.');
		}
	});

	const checkWorkspaceCommand = vscode.commands.registerCommand('pydoclint.checkWorkspace', () => {
		console.log('Pydoclint: checkWorkspace command triggered');
		vscode.window.setStatusBarMessage('Pydoclint: Checking workspace Python files...', 5000);
		checkWorkspacePythonFiles(diagnosticCollection);
	});

	context.subscriptions.push(checkFileCommand, checkWorkspaceCommand);

	// Auto-check on save
	const onSaveDisposable = vscode.workspace.onDidSaveTextDocument((document) => {
		if (document.languageId === 'python') {
			const config = vscode.workspace.getConfiguration('pydoclint');
			if (config.get('enabled', true)) {
				checkPythonFile(document, diagnosticCollection);
			}
		}
	});

	context.subscriptions.push(onSaveDisposable);

	// Auto-check on open
	const onOpenDisposable = vscode.workspace.onDidOpenTextDocument((document) => {
		if (document.languageId === 'python') {
			const config = vscode.workspace.getConfiguration('pydoclint');
			if (config.get('enabled', true)) {
				checkPythonFile(document, diagnosticCollection);
			}
		}
	});

	context.subscriptions.push(onOpenDisposable);

	// Check already open Python files
	vscode.workspace.textDocuments.forEach(document => {
		if (document.languageId === 'python') {
			const config = vscode.workspace.getConfiguration('pydoclint');
			if (config.get('enabled', true)) {
				checkPythonFile(document, diagnosticCollection);
			}
		}
	});
}

async function checkPythonFile(document: vscode.TextDocument, diagnosticCollection: vscode.DiagnosticCollection) {
	if (document.isUntitled) {
		console.log('Pydoclint: Skipping untitled document');
		return;
	}

	try {
		console.log('Pydoclint: Starting check for file:', document.fileName);
		const filePath = document.fileName;
		const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
		const workspaceRoot = workspaceFolder?.uri.fsPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
		const config = vscode.workspace.getConfiguration('pydoclint');
		
		// Get configuration
		const style = config.get('style', 'google');
		const configFile = config.get('configFile', 'pyproject.toml');
		const ignoreVirtualEnv = config.get('ignoreVirtualEnv', true);
		const ignorePaths: string[] = config.get('ignorePaths', []);
		
		console.log('Pydoclint: Using style:', style);
		console.log('Pydoclint: Config file:', configFile);
		
		// If ignorePaths is provided, check glob patterns first
		if (Array.isArray(ignorePaths) && ignorePaths.length > 0) {
			const workspaceRoot = workspaceFolder?.uri.fsPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
			if (isIgnoredByPatterns(filePath, ignorePaths, workspaceRoot)) {
				console.log('Pydoclint: Skipping file matched by ignorePaths:', filePath);
				return;
			}
		} else if (ignoreVirtualEnv && isInVirtualEnv(filePath)) {
			console.log('Pydoclint: Skipping file inside virtual environment:', filePath);
			return;
		}

		// Build pydoclint command
		const args = [
			'--style', style,
			'--quiet',
			filePath
		];
		
		// Add config file if it exists (use workspaceRoot fallback)
		if (workspaceRoot) {
			const configPath = path.join(workspaceRoot, configFile);
			if (fs.existsSync(configPath)) {
				args.unshift('--config', configPath);
				console.log('Pydoclint: Using config file:', configPath);
			} else {
				console.log('Pydoclint: Config file not found:', configPath);
			}
		}

		console.log('Pydoclint: Running command with args:', args);
		const errors = await runPydoclint(args, workspaceRoot);
		console.log('Pydoclint: Found', errors.length, 'errors');
		
		const diagnostics = parsePydoclintOutput(errors, document);
		console.log('Pydoclint: Created', diagnostics.length, 'diagnostics');
		
		diagnosticCollection.set(document.uri, diagnostics);
		
		if (diagnostics.length > 0) {
			vscode.window.setStatusBarMessage(`Pydoclint: Found ${diagnostics.length} issues`, 4000);
		} else {
			vscode.window.setStatusBarMessage('Pydoclint: No issues found', 3000);
		}
	} catch (error) {
		console.error('Pydoclint: Error running pydoclint:', error);
		vscode.window.showErrorMessage(`Pydoclint error: ${error}`);
	}
}

async function checkWorkspacePythonFiles(diagnosticCollection: vscode.DiagnosticCollection) {
	const pythonFiles = await vscode.workspace.findFiles('**/*.py', '**/node_modules/**');
	
	for (const fileUri of pythonFiles) {
		try {
			const document = await vscode.workspace.openTextDocument(fileUri);
			await checkPythonFile(document, diagnosticCollection);
		} catch (error) {
			console.error(`Error checking file ${fileUri.fsPath}:`, error);
		}
	}
	
	vscode.window.setStatusBarMessage('Pydoclint workspace check completed.', 4000);
}

function runPydoclint(args: string[], cwd?: string): Promise<PydoclintError[]> {
	return new Promise((resolve, reject) => {
		console.log('Pydoclint: Spawning process with args:', args);
		console.log('Pydoclint: Working directory:', cwd);
		
		const child = spawn('pydoclint', args, {
			cwd: cwd,
			shell: true
		});
		
		let stdout = '';
		let stderr = '';
		
		child.stdout.on('data', (data) => {
			stdout += data.toString();
		});
		
		child.stderr.on('data', (data) => {
			stderr += data.toString();
		});
		
		child.on('close', (code) => {
			console.log('Pydoclint: Process exited with code:', code);
			console.log('Pydoclint: stdout:', stdout);
			console.log('Pydoclint: stderr:', stderr);
			
			if (code === 0) {
				resolve([]);  // No errors
			} else {
				// Parse pydoclint output
				const errors = parseRawPydoclintOutput(stdout + stderr);
				resolve(errors);
			}
		});
		
		child.on('error', (error) => {
			console.error('Pydoclint: Process error:', error);
			if (error.message.includes('ENOENT')) {
				reject(new Error('pydoclint not found. Please install it: pip install pydoclint'));
			} else {
				reject(error);
			}
		});
	});
}

function parseRawPydoclintOutput(output: string): PydoclintError[] {
	const errors: PydoclintError[] = [];
	const lines = output.split('\n');
	
	let currentFile = '';
	
	for (const line of lines) {
		const trimmedLine = line.trim();
		
		// Detect file path (usually the first non-empty line or line without indentation)
		if (trimmedLine && !trimmedLine.startsWith(' ') && trimmedLine.endsWith('.py')) {
			currentFile = trimmedLine;
			continue;
		}
		
		// Parse error line format: "    123: DOC501: Function `example` has no docstring"
		const errorMatch = trimmedLine.match(/^(\d+):\s+([A-Z]+\d+):\s+(.+)$/);
		
		if (errorMatch && currentFile) {
			const [, lineStr, code, message] = errorMatch;
			errors.push({
				file: currentFile,
				line: parseInt(lineStr, 10),
				code: code,
				message: message
			});
		}
	}
	
	return errors;
}

function parsePydoclintOutput(errors: PydoclintError[], document: vscode.TextDocument): vscode.Diagnostic[] {
	const diagnostics: vscode.Diagnostic[] = [];
	
	for (const error of errors) {
		// Check if error is for this file
		const errorFilePath = path.resolve(error.file);
		const documentFilePath = path.resolve(document.fileName);
		
		if (errorFilePath === documentFilePath) {
			const line = Math.max(0, error.line - 1);  // VS Code uses 0-based line numbers
			const range = new vscode.Range(line, 0, line, document.lineAt(line).text.length);
			
			const severity = getSeverityFromCode(error.code);
			
			const diagnostic = new vscode.Diagnostic(
				range,
				`${error.code}: ${error.message}`,
				severity
			);
			
			diagnostic.source = 'pydoclint';
			diagnostic.code = error.code;
			
			diagnostics.push(diagnostic);
		}
	}
	
	return diagnostics;
}

function getSeverityFromCode(code: string): vscode.DiagnosticSeverity {
	// Customize severity based on error codes
	if (code.startsWith('DOC5')) {
		return vscode.DiagnosticSeverity.Error;  // Missing docstrings
	} else if (code.startsWith('DOC1') || code.startsWith('DOC2')) {
		return vscode.DiagnosticSeverity.Warning;  // Formatting issues
	} else {
		return vscode.DiagnosticSeverity.Information;  // Other issues
	}
}

function isInVirtualEnv(filePath: string): boolean {
	// Common virtual environment folder names
	const venvNames = ['venv', '.venv', 'env', '.env', 'envs', 'venvs'];

	// Normalize and check each segment of the path
	const parts = path.normalize(filePath).split(path.sep);

	for (const part of parts) {
		if (venvNames.includes(part)) {
			return true;
		}
	}

	return false;
}

function isIgnoredByPatterns(filePath: string, patterns: string[], workspaceRoot?: string): boolean {
	// Convert to a path relative to workspace root when possible so patterns like **/site-packages/** match
	let target = filePath;
	if (workspaceRoot) {
		try {
			const relative = path.relative(workspaceRoot, filePath);
			// If relative does not start with .. then it's inside workspace
			if (!relative.startsWith('..')) {
				target = relative;
			}
		} catch (e) {
			// fallback to absolute
		}
	}

	for (const pattern of patterns) {
		try {
			if (minimatch(target, pattern, { dot: true })) {
				return true;
			}
		} catch (e) {
			console.error('Pydoclint: Invalid ignore pattern', pattern, e);
		}
	}

	return false;
}

// This method is called when your extension is deactivated
export function deactivate() {
	console.log('Pydoclint extension deactivated.');
}
