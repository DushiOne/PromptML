import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

let promptCounter = 0;

interface TemplateField {
    name: string;
    required: boolean;
    type: 'string' | 'number' | 'boolean' | 'array';
    arrayType?: 'object';
    objectFields?: {
        [key: string]: {
            required: boolean;
            type: 'string';
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
    }
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
    console.log('LLM Prompt Saver is now active!');

    let disposable = vscode.commands.registerCommand('llm-prompt-saver.savePrompt', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const selection = editor.selection;
            const text = document.getText(selection);

            if (text) {
                const templateNames = templates.map(t => t.name);
                const selectedTemplate = await vscode.window.showQuickPick(templateNames, {
                    placeHolder: 'Select a template'
                });

                if (!selectedTemplate) return;

                const template = templates.find(t => t.name === selectedTemplate);
                if (!template) return;

                if (!validatePrompt(text, template)) return;

                const config = vscode.workspace.getConfiguration('llmPromptSaver');
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
                    promptsFolder = path.join(workspaceFolder.uri.fsPath, 'llm-prompts');
                }
                
                if (!fs.existsSync(promptsFolder)) {
                    fs.mkdirSync(promptsFolder, { recursive: true });
                }

                const timestamp = new Date().toISOString().replace(/:/g, '-');
                const fileName = `prompt_${++promptCounter}_${timestamp}.json`;
                const filePath = path.join(promptsFolder, fileName);

                fs.writeFileSync(filePath, text);

                vscode.window.showInformationMessage(`Prompt saved: ${fileName}`);
            } else {
                vscode.window.showWarningMessage('No text selected to save as prompt.');
            }
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}