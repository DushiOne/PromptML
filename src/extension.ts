import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { CompletionItem, CompletionItemKind, Position, Range } from 'vscode';

let promptCounter = 0;

interface TemplateField {
    name: string;
    required: boolean;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    arrayType?: 'object';
    objectFields?: {
        [key: string]: {
            required: boolean;
            type: 'string' | 'number' | 'boolean' | 'array';
        };
    };
}




interface Template {
    name: string;
    fields: TemplateField[];
}

const templates: Template[] = [
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
    },
    {
        name: 'GPT-3 Completion',
        fields: [
            { name: 'prompt', required: true, type: 'string' },
            { name: 'max_tokens', required: true, type: 'number' },
            { name: 'temperature', required: true, type: 'number' },
        ]
    },
    {
        name: 'Claude 2 and Earlier',
        fields: [
            { name: 'prompt', required: true, type: 'string' },
            { name: 'max_tokens_to_sample', required: true, type: 'number' },
            { name: 'temperature', required: true, type: 'number' },
        ]
    },
    {
        name: 'Claude 3 (Messages API)',
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
            },
            { name: 'max_tokens', required: true, type: 'number' },
            { name: 'temperature', required: true, type: 'number' },
        ]
    },
    {
        name: 'Meta Models (LLaMA, OPT)',
        fields: [
            { name: 'prompt', required: true, type: 'string' },
            { name: 'max_tokens', required: true, type: 'number' },
            { name: 'temperature', required: true, type: 'number' },
        ]
    },
    {
        name: 'Amazon Titan',
        fields: [
            { name: 'inputText', required: true, type: 'string' },
            {
                name: 'textGenerationConfig',
                required: true,
                type: 'object',
                objectFields: {
                    maxTokenCount: { required: true, type: 'number' },
                    temperature: { required: true, type: 'number' },
                    topP: { required: true, type: 'number' },
                    stopSequences: { required: true, type: 'array' },
                }
            },
        ]
    },
    {
        name: 'Anthropic Claude on Bedrock',
        fields: [
            { name: 'prompt', required: true, type: 'string' },
            { name: 'max_tokens_to_sample', required: true, type: 'number' },
            { name: 'temperature', required: true, type: 'number' },
            { name: 'top_k', required: true, type: 'number' },
            { name: 'top_p', required: true, type: 'number' },
            { name: 'stop_sequences', required: true, type: 'array' },
        ]
    },
    {
        name: 'AI21 Jurassic-2 on Bedrock',
        fields: [
            { name: 'prompt', required: true, type: 'string' },
            { name: 'maxTokens', required: true, type: 'number' },
            { name: 'temperature', required: true, type: 'number' },
            { name: 'topP', required: true, type: 'number' },
            { name: 'stopSequences', required: true, type: 'array' },
            {
                name: 'countPenalty',
                required: true,
                type: 'object',
                objectFields: {
                    scale: { required: true, type: 'number' },
                }
            },
            {
                name: 'presencePenalty',
                required: true,
                type: 'object',
                objectFields: {
                    scale: { required: true, type: 'number' },
                }
            },
            {
                name: 'frequencyPenalty',
                required: true,
                type: 'object',
                objectFields: {
                    scale: { required: true, type: 'number' },
                }
            },
        ]
    },
    {
        name: 'Cohere Command on Bedrock',
        fields: [
            { name: 'prompt', required: true, type: 'string' },
            { name: 'max_tokens', required: true, type: 'number' },
            { name: 'temperature', required: true, type: 'number' },
            { name: 'p', required: true, type: 'number' },
            { name: 'k', required: true, type: 'number' },
            { name: 'stop_sequences', required: true, type: 'array' },
            { name: 'return_likelihoods', required: true, type: 'string' },
        ]
    },
];

function validatePrompt(text: string, template: Template): boolean {
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
                } else if (field.type === 'object' && typeof promptObject[field.name] === 'object') {
                    // Validate object fields
                    if (field.objectFields) {
                        for (const [objField, objFieldDef] of Object.entries(field.objectFields)) {
                            if (objFieldDef.required && !(objField in promptObject[field.name])) {
                                vscode.window.showErrorMessage(`Missing required field in object: ${objField}`);
                                return false;
                            }
                            if (objField in promptObject[field.name] && typeof promptObject[field.name][objField] !== objFieldDef.type) {
                                vscode.window.showErrorMessage(`Invalid type for field ${objField} in object. Expected ${objFieldDef.type}.`);
                                return false;
                            }
                        }
                    }
                } else if (typeof promptObject[field.name] !== field.type) {
                    vscode.window.showErrorMessage(`Invalid type for field ${field.name}. Expected ${field.type}.`);
                    return false;
                }
            }
        }
        return true;
    } catch (error) {
        vscode.window.showErrorMessage('Invalid JSON format');
        return false;
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('PromptML is now active!');

    // Create a status bar item for LLM detection
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    context.subscriptions.push(statusBarItem);

    // Create a status bar item for the template selector
    const templateSelector = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 200);
    templateSelector.command = 'promptml.selectTemplate';
    context.subscriptions.push(templateSelector);

    let currentTemplate: Template | undefined;

    // Function to update status bar
    function updateStatusBarItems(editor: vscode.TextEditor | undefined) {
        if (editor && (editor.document.languageId === 'prp' || editor.document.fileName.endsWith('.prp'))) {
            const text = editor.document.getText();
            const isValid = currentTemplate ? validatePrompt(text, currentTemplate) : false;
            statusBarItem.text = `LLM PROMPT DETECTED ${isValid ? '$(check)' : '$(x)'}`;
            statusBarItem.show();
            templateSelector.text = currentTemplate ? `$(list-unordered) ${currentTemplate.name}` : "$(list-unordered) Select Template";
            templateSelector.tooltip = "Click to select a template";
            templateSelector.show();
        } else {
            statusBarItem.hide();
            templateSelector.hide();
        }
    }

    // Update status bar when active editor changes
    vscode.window.onDidChangeActiveTextEditor(updateStatusBarItems);

    // Update status bar when the document is changed
    vscode.workspace.onDidChangeTextDocument(event => {
        if (vscode.window.activeTextEditor && event.document === vscode.window.activeTextEditor.document) {
            updateStatusBarItems(vscode.window.activeTextEditor);
        }
    });

    // Update status bar for the current active editor
    updateStatusBarItems(vscode.window.activeTextEditor);

    // Command to select a template
    let selectTemplateDisposable = vscode.commands.registerCommand('promptml.selectTemplate', async () => {
        const templateNames = templates.map(t => t.name);
        const selectedTemplateName = await vscode.window.showQuickPick(templateNames, {
            placeHolder: 'Select a template'
        });

        if (selectedTemplateName) {
            currentTemplate = templates.find(t => t.name === selectedTemplateName);
            updateStatusBarItems(vscode.window.activeTextEditor);
            vscode.window.showInformationMessage(`Template selected: ${selectedTemplateName}`);
        }
    });

    let savePromptDisposable = vscode.commands.registerCommand('promptml.savePrompt', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const selection = editor.selection;
            let text: string;

            // Check if there's a selection
            if (!selection.isEmpty) {
                text = document.getText(selection);
            } else {
                // If no selection, use the entire document
                text = document.getText();
            }

            if (text) {
                const templateNames = templates.map(t => t.name);
                const selectedTemplate = await vscode.window.showQuickPick(templateNames, {
                    placeHolder: 'Select a template'
                });

                if (!selectedTemplate) return;

                const template = templates.find(t => t.name === selectedTemplate);
                if (!template) return;

                if (!validatePrompt(text, template)) return;

                const config = vscode.workspace.getConfiguration('promptml');
                const customSaveLocation = config.get<string>('saveLocation');
                
                let promptsFolder: string;
                if (customSaveLocation) {
                    promptsFolder = path.resolve(customSaveLocation);
                } else {
                    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
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
                const jsonDocument = await vscode.workspace.openTextDocument({
                    content: text,
                    language: 'json'
                });
                await vscode.window.showTextDocument(jsonDocument);

                vscode.window.showInformationMessage(`Prompt saved: ${fileName}`);
            } else {
                vscode.window.showWarningMessage('No text to save as prompt.');
            }
        }
    });

    let savePromptWithVersionDisposable = vscode.commands.registerCommand('promptml.savePromptWithVersion', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const selection = editor.selection;
            let text: string;

            // Check if there's a selection
            if (!selection.isEmpty) {
                text = document.getText(selection);
            } else {
                // If no selection, use the entire document
                text = document.getText();
            }

            if (text) {
                const templateNames = templates.map(t => t.name);
                const selectedTemplate = await vscode.window.showQuickPick(templateNames, {
                    placeHolder: 'Select a template'
                });

                if (!selectedTemplate) return;

                const template = templates.find(t => t.name === selectedTemplate);
                if (!template) return;

                if (!validatePrompt(text, template)) return;

                const config = vscode.workspace.getConfiguration('promptml');
                const customSaveLocation = config.get<string>('saveLocation');
                
                let promptsFolder: string;
                if (customSaveLocation) {
                    promptsFolder = path.resolve(customSaveLocation);
                } else {
                    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
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
                const promptName = await vscode.window.showInputBox({
                    prompt: 'Enter a name for this prompt',
                    placeHolder: 'my_prompt'
                });

                if (!promptName) return;

                const version = await vscode.window.showInputBox({
                    prompt: 'Enter a version for this prompt',
                    placeHolder: '1.0.0'
                });

                if (!version) return;

                const fileName = `${promptName}_v${version}_${timestamp}.json`;
                const filePath = path.join(promptsFolder, fileName);

                fs.writeFileSync(filePath, text);

                // Add syntax highlighting
                const jsonDocument = await vscode.workspace.openTextDocument({
                    content: text,
                    language: 'json'
                });
                await vscode.window.showTextDocument(jsonDocument);

                vscode.window.showInformationMessage(`Prompt saved: ${fileName}`);
            } else {
                vscode.window.showWarningMessage('No text to save as prompt.');
            }
        }
    });

    let checkAndSuggestDisposable = vscode.commands.registerCommand('promptml.checkAndSuggestTemplate', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const text = document.getText();

            try {
                const promptObject = JSON.parse(text);
                const matchingTemplates = templates.filter(template => 
                    template.fields.every(field => field.name in promptObject)
                );

                if (matchingTemplates.length > 0) {
                    const templateNames = matchingTemplates.map(t => t.name);
                    const selectedTemplate = await vscode.window.showQuickPick(templateNames, {
                        placeHolder: 'Select a matching template to validate against'
                    });

                    if (selectedTemplate) {
                        const template = templates.find(t => t.name === selectedTemplate);
                        if (template && validatePrompt(text, template)) {
                            vscode.window.showInformationMessage(`Prompt is valid for template: ${selectedTemplate}`);
                        }
                    }
                } else {
                    vscode.window.showWarningMessage('No matching templates found for this prompt structure.');
                }
            } catch (error) {
                vscode.window.showErrorMessage('Invalid JSON format');
            }
        }
    });

    let completionDisposable = vscode.languages.registerCompletionItemProvider(
        [{ scheme: 'file', language: 'json' }, { scheme: 'file', pattern: '**/*.prp' }],
        {
            provideCompletionItems(document: vscode.TextDocument, position: Position) {
                const linePrefix = document.lineAt(position).text.substr(0, position.character);
                if (!linePrefix.endsWith('{')) {
                    return undefined;
                }

                const completionItems: CompletionItem[] = [];

                for (const template of templates) {
                    const completionItem = new CompletionItem(template.name, CompletionItemKind.Snippet);
                    completionItem.detail = `Template: ${template.name}`;
                    
                    let snippetText = '\n';
                    template.fields.forEach((field, index) => {
                        snippetText += `\t"${field.name}": ${getSnippetPlaceholder(field, index + 1)}`;
                        if (index < template.fields.length - 1) {
                            snippetText += ',';
                        }
                        snippetText += '\n';
                    });
                    // Remove the last closing brace
                    // snippetText += '}';

                    completionItem.insertText = new vscode.SnippetString(snippetText);
                    completionItems.push(completionItem);
                }

                return completionItems;
            }
        },
        '{' // Trigger character
    );

    context.subscriptions.push(savePromptDisposable, savePromptWithVersionDisposable, checkAndSuggestDisposable, completionDisposable, selectTemplateDisposable);
}


function getSnippetPlaceholder(field: TemplateField, index: number): string {
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

export function deactivate() {}