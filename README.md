 # PromptML

PromptML is a Visual Studio Code extension designed to streamline the creation, management, and validation of Language Model (LLM) prompts. It provides a structured approach to working with prompts, offering versioning capabilities and predefined templates.

## Features

### 1. Prompt Templates
- Predefined templates for common prompt structures:
  - Basic Prompt
  - Question-Answer
  - Context-Question-Answer
  - GPT-4 Conversation

### 2. Prompt Saving
- Two saving options:
  - Quick save: `promptml.savePrompt`
  - Save with custom version: `promptml.savePromptWithVersion`
- Automatic versioning and timestamps
- Custom save locations

### 3. Template Validation
- Validate prompts against selected templates
- Ensure all required fields are present and of the correct type

### 4. Intelligent Suggestions
- Get template suggestions as you type
- Triggered when you start a new JSON object with '{'

### 5. Custom File Format
- Introduces `.prp` file extension for prompts
- JSON-based syntax highlighting for `.prp` files

### 6. Status Bar Indicator
- Shows "LLM PROMPT DETECTED" in the status bar when working with `.prp` files

## Installation

1. Open Visual Studio Code
2. Go to the Extensions view (Ctrl+Shift+X or Cmd+Shift+X)
3. Search for "PromptML"
4. Click Install

## Usage

1. Create a new file with `.json` or `.prp` extension
2. Start typing '{' to get template suggestions
3. Fill in the prompt details
4. Use the command palette (Ctrl+Shift+P or Cmd+Shift+P) to access PromptML commands:
   - "Save PromptML"
   - "Save PromptML with Version"
   - "PromptML: Check and Suggest Template"

## Commands

- `Save PromptML`: Quickly save the current prompt
- `Save PromptML with Version`: Save the prompt with a custom name and version
- `PromptML: Check and Suggest Template`: Validate the current prompt against available templates

## Configuration

This extension contributes the following settings:

- `promptml.saveLocation`: Custom location to save prompts. Leave empty to use the default location in the workspace.

## Requirements

- Visual Studio Code v1.60.0 or higher

## Known Issues

[List any known issues or limitations here]

## Release Notes

### 0.1.0

Initial release of PromptML

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This extension is licensed under the [MIT License](LICENSE).