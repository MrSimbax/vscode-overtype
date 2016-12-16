import * as vscode from "vscode";

import { configuration, reloadConfiguration } from "./configuration";
import { createStatusBarItem, destroyStatusBarItem, updateStatusBarItem } from "./statusBarItem";
import { getMode, toggleMode, resetModes } from "./mode";
import { overtypeBeforeType, overtypeBeforePaste } from "./behavior";

// initialization //////////////////////////////////////////////////////////////

export function activate(context: vscode.ExtensionContext) {
    const statusBarItem = createStatusBarItem();

    context.subscriptions.push(
        vscode.commands.registerCommand('overtype.toggle', toggleCommand),

        vscode.commands.registerCommand('type', typeCommand),
        vscode.commands.registerCommand('paste', pasteCommand),

        vscode.window.onDidChangeActiveTextEditor(activeTextEditorChanged),

        vscode.workspace.onDidChangeConfiguration(onDidChangeConfiguration),

        statusBarItem
    );
}

export function deactivate() {
    destroyStatusBarItem();
}

// command handlers ////////////////////////////////////////////////////////////

function activeTextEditorChanged(textEditor?: vscode.TextEditor) {
    if (textEditor === undefined) {
        textEditor = vscode.window.activeTextEditor;
    }

    if (textEditor == null) {
        updateStatusBarItem(null);
    } else {
        const mode = getMode(textEditor);
        updateStatusBarItem(mode);

        // if in overtype mode, set the cursor to block style; otherwise, reset to default
        textEditor.options.cursorStyle = mode
            ? vscode.TextEditorCursorStyle.Block
            : configuration.defaultCursorStyle;
    }
}

function toggleCommand() {
    const textEditor = vscode.window.activeTextEditor;
    if (textEditor == null) {
        return;
    }

    toggleMode(textEditor);
    activeTextEditorChanged(textEditor);
}

function onDidChangeConfiguration() {
    const previousPerEditor = configuration.perEditor;
    const updated = reloadConfiguration();

    // update state if the per-editor/global configuration option changes
    if (updated && configuration.perEditor !== previousPerEditor) {

        const textEditor = vscode.window.activeTextEditor;
        const mode = textEditor != null ? getMode(textEditor) : null;

        resetModes(mode, configuration.perEditor);
    }

    if (updated) {
        activeTextEditorChanged();
    }
}

function shouldPerformOvertype() {
    if (!vscode.window.activeTextEditor) return false;

    const editor = vscode.window.activeTextEditor;
    const mode = getMode(editor);

    return mode;
}

function typeCommand(args: { text: string }) {
    if (shouldPerformOvertype()) {
        const editor = vscode.window.activeTextEditor;
        overtypeBeforeType(editor, args.text);
    }

    return vscode.commands.executeCommand('default:type', args);
}

function pasteCommand(args: { text: string, pasteOnNewLine: boolean }) {
    if (configuration.paste && shouldPerformOvertype()) {
        const editor = vscode.window.activeTextEditor;
        overtypeBeforePaste(editor, args.text, args.pasteOnNewLine);
    }

    return vscode.commands.executeCommand('default:paste', args);
}
