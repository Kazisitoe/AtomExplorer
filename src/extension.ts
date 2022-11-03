/* eslint-disable @typescript-eslint/naming-convention */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from 'fs';
import * as vscode from 'vscode';
import { AtomExplorer, AtomNode } from "./AtomExplorerProvider";
import * as path from 'path';
import * as fsutil from "./fsutil";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

interface ScriptType {
	type: string;
	environment: string | null;
	filePath: string,
	error?: string | null;

}
const getScriptType = async (filePath: string, truePath?:string): Promise<ScriptType | null> => {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {return Promise.reject(null);}
	const srcDirectory = path.join(workspaceFolders[0].uri.fsPath, "src");
	let type = "Unknown";
	let environment = null;
	let error = null;

	switch (filePath) {
		case(path.join(srcDirectory, "Modules")):
		case(path.join(srcDirectory, "Systems")):
		case(path.join(srcDirectory, "Remotes.json")):
			type = "Invalid";
			error = "Cannot add script in selected location";
			break;
		case (path.join(srcDirectory, "Client")):
			environment = environment || "Client";
		case (path.join(srcDirectory, "Server")):
			environment = environment || "Server";
			type = "Basic";
			break;
		case (path.join(srcDirectory, "Modules", "Server")):
			environment = environment || "Server";
		case (path.join(srcDirectory, "Modules", "Shared")):
			environment = environment || "Shared";
		case (path.join(srcDirectory, "Modules", "Client")):
			environment = environment || "Client";
			type = "Module";
			break;
		case (path.join(srcDirectory, "Systems", "Client")):
			environment = environment || "Client";
		case (path.join(srcDirectory, "Systems", "Server")):
			environment = environment || "Server";
		case (path.join(srcDirectory, "Systems", "Shared")):
			environment = environment || "Shared";
			type = "System";
			break;

	}

	if (type === "Unknown") {
		return getScriptType(path.join(filePath, "../").slice(0, -1), truePath || filePath);
	}

	return {
		type: type,
		environment: environment,
		filePath: truePath || filePath,
		error: error,

	};

};
const isImportant = async (filePath: string): Promise<boolean> => {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {return Promise.reject(null);}
	const srcDirectory = path.join(workspaceFolders[0].uri.fsPath, "src");
	let important = false;

	switch (filePath) {
		case(path.join(srcDirectory, "Remotes.json")):
		case(path.join(srcDirectory, "Modules")):
		case(path.join(srcDirectory, "Systems")):
		case (path.join(srcDirectory, "Client")):
		case (path.join(srcDirectory, "Server")):
		case (path.join(srcDirectory, "Modules", "Server")):
		case (path.join(srcDirectory, "Modules", "Shared")):
		case (path.join(srcDirectory, "Modules", "Client")):
		case (path.join(srcDirectory, "Systems", "Client")):
		case (path.join(srcDirectory, "Systems", "Server")):
		case (path.join(srcDirectory, "Systems", "Shared")):
			important = true;
			break;

	}

	return important;

};

const reservedNames:{ [label:string]:boolean } = {
    "Client": true,
    "Components": true,
    "Modules": true,
    "Server": true,
    "Systems": true,
    "Remotes": true,
}

// const QUICK_PICK_FILEPATHS: { [environment: string]: { [type: string]: string } } = {
// 	"Server": {
// 		"Basic": "src/Server",
// 		"Module": "src/Modules/Server",
// 		"System": "src/Systems/Server",
// 	},
// 	"Client": {
// 		"Basic": "src/Client",
// 		"Module": "src/Modules/Shared",
// 		"System": "src/Systems/Client",
// 	},
// 	"Shared": {
// 		"Basic": "src/Client",
// 		"Module": "src/Modules/Shared",
// 		"System": "src/Systems/Shared",
// 	}
// };

const LUA_TEMPLATES: { [type: string]: string } = {
	"Basic":
`
--// VARIABLES

--// BEHAVIOR
return function(World, Components, Modules)

end`,
	"Module":
`
--// VARIABLES
local Module = {}


return Module
`,
	"System":
`
--// VARIABLES
local ECS = require(game.ReplicatedStorage.Packages.KazECS)
local World, Components = ECS.World, ECS.Components

--// SYSTEM
local EVENT = "DEFAULT"
local function SYSTEM()

end


return { Event = EVENT, System = SYSTEM }

`

};

const getSourceFileName = async (directoryPath: string | null, selectionEnv: string, selectionType: string, checkIfExists: boolean): Promise<string | undefined> => {
	const trueDirectoryPath = (directoryPath || "");
	const fileName = await vscode.window.showInputBox({
		placeHolder: "",
		prompt: ("Create new " + selectionEnv + " " + selectionType),
		value: ("Module"),
		// valueSelection: [0, valuePrefix.length],
		validateInput: async (value: string): Promise<string | null> => {
			value = value.trim();
			if (value.match(/^\d/g)) {
				return "Name cannot begin with a number";
			} else if (value.match(/[^a-z0-9_]/gi)) {
				return "Name must be alpha-numeric";
			} else if (value.toLowerCase() === "init") {
				return "Name cannot be \"init\"";
			} else if (reservedNames[value]) {
				return "Name cannot be a reserved name";
			}
			return (checkIfExists && await fsutil.doesFileExist(path.join(trueDirectoryPath, `${value}.lua`))) ? `${value} already exists` : null;
		}
	});
	if (fileName) {
		return fileName.trim();
	}
	
};

export function activate(context: vscode.ExtensionContext) {
	
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {return;}
	const atomExplorer = new AtomExplorer(workspaceFolders[0].uri.fsPath);

	const atomRefresh = vscode.commands.registerCommand("atomexplorer.atomRefresh", () => {
		atomExplorer.refresh();
	});
	const atomCreate = vscode.commands.registerCommand("atomexplorer.atomCreate", async(selectedNode: AtomNode): Promise<void> => {
		const PROJECT_ROOT = workspaceFolders[0].uri.fsPath;
		const node = selectedNode || atomExplorer.selectedNode;
		if (node && path.basename(node.filePath) === "init.lua") {
			vscode.window.showWarningMessage("Cannot created nested module in init file");
			return;
		}
		const scriptType = await getScriptType(node ? node.filePath : PROJECT_ROOT);
		if (!scriptType) {return;}
		if (scriptType.error) {
			vscode.window.showErrorMessage(scriptType.error);

			return;

		}

		const environment = scriptType.environment;
		if (!environment) {return;}
		const type = scriptType.type;
		if (type === "Unknown" || type === "Invalid") { return; }
		
		const directPath = scriptType.filePath; // path.join(PROJECT_ROOT, QUICK_PICK_FILEPATHS[environment][type]);
		const fileName = await getSourceFileName(directPath, environment, type, true);
		if (!fileName) {return;}

		const folderPath = path.join(directPath, fileName);
		const exists = await fsutil.doesFileExist(folderPath);
		if (exists) {
			vscode.window.showErrorMessage(`${fileName} already exists`);
		} else {
			const filePath = path.join(folderPath, "init.lua");
			await fsutil.createDirIfNotExist(folderPath);
			await fsutil.createFile(filePath, LUA_TEMPLATES[type]);
			vscode.window.showInformationMessage(`Created ${fileName}`);
			const doc = await vscode.workspace.openTextDocument(filePath);
			vscode.window.showTextDocument(doc, { preserveFocus: true });
			atomExplorer.refresh();
		}

	});
	const atomDelete = vscode.commands.registerCommand("atomexplorer.atomDelete", async(node: AtomNode): Promise<void> => {
		if (!node) {return;}

		const filePath = node.filePath;
		if (await isImportant(filePath)) {
			vscode.window.showErrorMessage(`Cannot delete important directory`);

			return;

		}

		if (await fsutil.doesFileExist(filePath)) {
			fsutil.deleteFile(filePath).catch(() => {
				fsutil.deleteDir(filePath);
			});
		}

		vscode.window.showInformationMessage(`Deleted ${path.basename(filePath)}`);
		atomExplorer.refresh();

	});
	const atomMove = vscode.commands.registerCommand("atomexplorer.atomMove", async(original:string, movedTo:string): Promise<void> => {
		const scriptType = await getScriptType(movedTo);
		if (!scriptType) { return; }
		if (scriptType.error) {
			vscode.window.showErrorMessage(scriptType.error);

			return;

		}
		const environment = scriptType.environment;
		if (!environment) { return; }
		const type = scriptType.type;
		if (type === "Unknown" || type === "Invalid") { return; }

		fs.rename(original, path.join(movedTo, path.basename(original)), console.log);

	});
	const atomRename = vscode.commands.registerCommand("atomexplorer.atomRename", async (selectedNode: AtomNode): Promise<void> => {
		const node = selectedNode || atomExplorer.selectedNode;
		if (!node) {return;}
		const scriptType = await getScriptType(node.filePath);
		if (!scriptType) { return; }
		if (scriptType.error) {
			vscode.window.showErrorMessage(scriptType.error);

			return;

		}

		const environment = scriptType.environment;
		if (!environment) { return; }
		const type = scriptType.type;
		if (type === "Unknown" || type === "Invalid") { return; }

		const directPath = scriptType.filePath; // path.join(PROJECT_ROOT, QUICK_PICK_FILEPATHS[environment][type]);
		const fileName = await getSourceFileName(directPath, environment, type, true);
		if (!fileName) { return; }

		fs.rename(node.filePath, path.join(node.filePath, "../", fileName), console.log);
		atomExplorer.refresh();

	});

	context.subscriptions.push(atomRefresh, atomCreate, atomDelete, atomMove, atomRename);
	
}

// this method is called when your extension is deactivated
export function deactivate() {}