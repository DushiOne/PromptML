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
const vscode_1 = require("vscode");
let promptCounter = 0;
const templates = [
    {
        name: 'Basic Prompt',
        fields: [
            { name: 'prompt', required: true, type: 'string' },
        ]
    },
    {
        name: 'Question-Answer',
        fields: [
            { name: 'question', required: true, type: 'string' },
            { name: 'answer', required: true, type: 'string' },
        ]
    },
    {
        name: 'Context-Question-Answer',
        fields: [
            { name: 'context', required: true, type: 'string' },
            { name: 'question', required: true, type: 'string' },
            { name: 'answer', required: true, type: 'string' },
        ]
    },
    {
        name: 'GPT-4 Conversation',
        fields: [
            {
                name: 'messages',
                required: true,
                type: 'array',
                arrayType: 'object',
                objectFields: {
                    role: { required: true, type: 'string' },
                    content: { required: true, type: 'string' },
                }
            }
        ]
    }
];
function validatePrompt(text, template) {
    try {
        const promptObject = JSON.parse(text);
        for (const field of template.fields) {
            if (field.required && !(field.name in promptObject)) {
                vscode.window.showErrorMessage(`Missing required field: ${field.name}`);
                return false;
            }
            if (field.name in promptObject) {
                if (field.type === 'array' && Array.isArray(promptObject[field.name])) {
                    if (field.arrayType === 'object' && field.objectFields) {
                        for (const item of promptObject[field.name]) {
                            for (const [objField, objFieldDef] of Object.entries(field.objectFields)) {
                                if (objFieldDef.required && !(objField in item)) {
                                    vscode.window.showErrorMessage(`Missing required field in array item: ${objField}`);
                                    return false;
                                }
                                if (objField in item && typeof item[objField] !== objFieldDef.type) {
                                    vscode.window.showErrorMessage(`Invalid type for field ${objField} in array item. Expected ${objFieldDef.type}.`);
                                    return false;
                                }
                            }
                        }
                    }
                }
                else if (typeof promptObject[field.name] !== field.type) {
                    vscode.window.showErrorMessage(`Invalid type for field ${field.name}. Expected ${field.type}.`);
                    return false;
                }
            }
        }
        return true;
    }
    catch (error) {
        vscode.window.showErrorMessage('Invalid JSON format');
        return false;
    }
}
function activate(context) {
    console.log('PromptML is now active!');
    // Create a status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    context.subscriptions.push(statusBarItem);
    // Function to update status bar
    function updateStatusBarItem(editor) {
        if (editor && (editor.document.languageId === 'prp' || editor.document.fileName.endsWith('.prp'))) {
            statusBarItem.text = "LLM PROMPT DETECTED";
            statusBarItem.show();
        }
        else {
            statusBarItem.hide();
        }
    }
    // Update status bar when active editor changes
    vscode.window.onDidChangeActiveTextEditor(updateStatusBarItem);
    // Update status bar for the current active editor
    updateStatusBarItem(vscode.window.activeTextEditor);
    let savePromptDisposable = vscode.commands.registerCommand('promptml.savePrompt', () => __awaiter(this, void 0, void 0, function* () {
        var _a;
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const selection = editor.selection;
            let text;
            // Check if there's a selection
            if (!selection.isEmpty) {
                text = document.getText(selection);
            }
            else {
                // If no selection, use the entire document
                text = document.getText();
            }
            if (text) {
                const templateNames = templates.map(t => t.name);
                const selectedTemplate = yield vscode.window.showQuickPick(templateNames, {
                    placeHolder: 'Select a template'
                });
                if (!selectedTemplate)
                    return;
                const template = templates.find(t => t.name === selectedTemplate);
                if (!template)
                    return;
                if (!validatePrompt(text, template))
                    return;
                const config = vscode.workspace.getConfiguration('promptml');
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
                    promptsFolder = path.join(workspaceFolder.uri.fsPath, 'promptml');
                }
                if (!fs.existsSync(promptsFolder)) {
                    fs.mkdirSync(promptsFolder, { recursive: true });
                }
                const timestamp = new Date().toISOString().replace(/:/g, '-');
                const fileName = `prompt_${++promptCounter}_${timestamp}.json`;
                const filePath = path.join(promptsFolder, fileName);
                fs.writeFileSync(filePath, text);
                // Add syntax highlighting
                const jsonDocument = yield vscode.workspace.openTextDocument({
                    content: text,
                    language: 'json'
                });
                yield vscode.window.showTextDocument(jsonDocument);
                vscode.window.showInformationMessage(`Prompt saved: ${fileName}`);
            }
            else {
                vscode.window.showWarningMessage('No text to save as prompt.');
            }
        }
    }));
    let savePromptWithVersionDisposable = vscode.commands.registerCommand('promptml.savePromptWithVersion', () => __awaiter(this, void 0, void 0, function* () {
        var _b;
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const selection = editor.selection;
            let text;
            // Check if there's a selection
            if (!selection.isEmpty) {
                text = document.getText(selection);
            }
            else {
                // If no selection, use the entire document
                text = document.getText();
            }
            if (text) {
                const templateNames = templates.map(t => t.name);
                const selectedTemplate = yield vscode.window.showQuickPick(templateNames, {
                    placeHolder: 'Select a template'
                });
                if (!selectedTemplate)
                    return;
                const template = templates.find(t => t.name === selectedTemplate);
                if (!template)
                    return;
                if (!validatePrompt(text, template))
                    return;
                const config = vscode.workspace.getConfiguration('promptml');
                const customSaveLocation = config.get('saveLocation');
                let promptsFolder;
                if (customSaveLocation) {
                    promptsFolder = path.resolve(customSaveLocation);
                }
                else {
                    const workspaceFolder = (_b = vscode.workspace.workspaceFolders) === null || _b === void 0 ? void 0 : _b[0];
                    if (!workspaceFolder) {
                        vscode.window.showErrorMessage('No workspace folder open. Please open a folder or set a custom save location.');
                        return;
                    }
                    promptsFolder = path.join(workspaceFolder.uri.fsPath, 'promptml');
                }
                if (!fs.existsSync(promptsFolder)) {
                    fs.mkdirSync(promptsFolder, { recursive: true });
                }
                const timestamp = new Date().toISOString().replace(/:/g, '-');
                const promptName = yield vscode.window.showInputBox({
                    prompt: 'Enter a name for this prompt',
                    placeHolder: 'my_prompt'
                });
                if (!promptName)
                    return;
                const version = yield vscode.window.showInputBox({
                    prompt: 'Enter a version for this prompt',
                    placeHolder: '1.0.0'
                });
                if (!version)
                    return;
                const fileName = `${promptName}_v${version}_${timestamp}.json`;
                const filePath = path.join(promptsFolder, fileName);
                fs.writeFileSync(filePath, text);
                // Add syntax highlighting
                const jsonDocument = yield vscode.workspace.openTextDocument({
                    content: text,
                    language: 'json'
                });
                yield vscode.window.showTextDocument(jsonDocument);
                vscode.window.showInformationMessage(`Prompt saved: ${fileName}`);
            }
            else {
                vscode.window.showWarningMessage('No text to save as prompt.');
            }
        }
    }));
    let checkAndSuggestDisposable = vscode.commands.registerCommand('promptml.checkAndSuggestTemplate', () => __awaiter(this, void 0, void 0, function* () {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const text = document.getText();
            try {
                const promptObject = JSON.parse(text);
                const matchingTemplates = templates.filter(template => template.fields.every(field => field.name in promptObject));
                if (matchingTemplates.length > 0) {
                    const templateNames = matchingTemplates.map(t => t.name);
                    const selectedTemplate = yield vscode.window.showQuickPick(templateNames, {
                        placeHolder: 'Select a matching template to validate against'
                    });
                    if (selectedTemplate) {
                        const template = templates.find(t => t.name === selectedTemplate);
                        if (template && validatePrompt(text, template)) {
                            vscode.window.showInformationMessage(`Prompt is valid for template: ${selectedTemplate}`);
                        }
                    }
                }
                else {
                    vscode.window.showWarningMessage('No matching templates found for this prompt structure.');
                }
            }
            catch (error) {
                vscode.window.showErrorMessage('Invalid JSON format');
            }
        }
    }));
    let completionDisposable = vscode.languages.registerCompletionItemProvider([{ scheme: 'file', language: 'json' }, { scheme: 'file', pattern: '**/*.prp' }], {
        provideCompletionItems(document, position) {
            const linePrefix = document.lineAt(position).text.substr(0, position.character);
            if (!linePrefix.endsWith('{')) {
                return undefined;
            }
            const completionItems = [];
            for (const template of templates) {
                const completionItem = new vscode_1.CompletionItem(template.name, vscode_1.CompletionItemKind.Snippet);
                completionItem.detail = `Template: ${template.name}`;
                let snippetText = '\n';
                template.fields.forEach((field, index) => {
                    snippetText += `\t"${field.name}": ${getSnippetPlaceholder(field, index + 1)}`;
                    if (index < template.fields.length - 1) {
                        snippetText += ',';
                    }
                    snippetText += '\n';
                });
                snippetText += '}';
                completionItem.insertText = new vscode.SnippetString(snippetText);
                completionItems.push(completionItem);
            }
            return completionItems;
        }
    }, '{' // Trigger character
    );
    context.subscriptions.push(savePromptDisposable, savePromptWithVersionDisposable, checkAndSuggestDisposable, completionDisposable);
}
exports.activate = activate;
function getSnippetPlaceholder(field, index) {
    switch (field.type) {
        case 'string':
            return `"$\{${index}:${field.name}}"`;
        case 'number':
            return `$\{${index}:0}`;
        case 'boolean':
            return `$\{${index}|true,false|}`;
        case 'array':
            if (field.arrayType === 'object' && field.objectFields) {
                let objectSnippet = '[\n\t\t{\n';
                const objectFields = Object.entries(field.objectFields);
                objectFields.forEach(([key, value], idx) => {
                    objectSnippet += `\t\t\t"${key}": "$\{${index}.${idx + 1}:${value.type}}",\n`;
                });
                objectSnippet = objectSnippet.slice(0, -2); // Remove last comma and newline
                objectSnippet += '\n\t\t}\n\t]';
                return objectSnippet;
            }
            return '[]';
        default:
            return `"$\{${index}:${field.name}}"`;
    }
}
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map