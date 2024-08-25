"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
let promptCounter = 0;
function activate(context) {
    console.log('LLM Prompt Saver is now active!');
    let disposable = vscode.commands.registerCommand('llm-prompt-saver.savePrompt', () => __awaiter(this, void 0, void 0, function* () {
        var _a;
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const selection = editor.selection;
            const text = document.getText(selection);
            if (text) {
                const config = vscode.workspace.getConfiguration('llmPromptSaver');
                const customSaveLocation = config.get('saveLocation');
                let promptsFolder;
                if (customSaveLocation) {
                    promptsFolder = path.resolve(customSaveLocation);
                }
                else {
                    const workspaceFolder = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0];
                    if (!workspaceFolder) {
                        vscode.window.showErrorMessage('No workspace folder open. Please open a folder or set a custom save location.');
                        return;
                    }
                    promptsFolder = path.join(workspaceFolder.uri.fsPath, 'llm-prompts');
                }
                if (!fs.existsSync(promptsFolder)) {
                    fs.mkdirSync(promptsFolder, { recursive: true });
                }
                const timestamp = new Date().toISOString().replace(/:/g, '-');
                const fileName = `prompt_${++promptCounter}_${timestamp}.txt`;
                const filePath = path.join(promptsFolder, fileName);
                fs.writeFileSync(filePath, text);
                vscode.window.showInformationMessage(`Prompt saved: ${fileName}`);
            }
            else {
                vscode.window.showWarningMessage('No text selected to save as prompt.');
            }
        }
    }));
    context.subscriptions.push(disposable);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map