import * as vscode from 'vscode';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as fsutil from "./fsutil";
// import "../resources/Client.svg";
// import "../resources/Components.svg";
// import "../resources/Modules.svg";
// import "../resources/Server.svg";

// const distFolder = path.join(path.dirname(__dirname), "dist");
const resourcesFolder = path.join(path.dirname(__dirname), "resources");
console.log(path.join(resourcesFolder, "Script.svg"));
const iconPaths:{ [label:string]:string } = {
    "Client": path.join(resourcesFolder, "Client.svg"),
    "Components": path.join(resourcesFolder, "Components.svg"),
    "Modules": path.join(resourcesFolder, "Modules.svg"),
    "Remotes": path.join(resourcesFolder, "Remotes.svg"),
    "Server": path.join(resourcesFolder, "Server.svg"),
    "Shared": path.join(resourcesFolder, "Shared.svg"),
    "Systems": path.join(resourcesFolder, "Systems.svg"),
}
const importantNodes:{ [label:string]:boolean } = {
    "Client": true,
    "Components": true,
    "Modules": true,
    "Server": true,
    "Systems": true,
    "Remotes": true,
}

export class AtomNode extends vscode.TreeItem {
    public constructor(
        public readonly label:string,
        public readonly collapsablestate:vscode.TreeItemCollapsibleState,
        public readonly filePath:string,
        public readonly fileType:fsutil.FsFileType,
        public readonly icon?:string,
        public readonly initFile?:string
    ) {
        super(label, collapsablestate);
        // this.iconPath = iconOverride || (fileType == fsutil.FsFileType.Directory && !initFile ? path.join(distFolder, folderPng) : scriptIcon);
        this.iconPath = iconPaths[label] || path.join(resourcesFolder, "Script.svg");

    }

    public contextValue = "node";

}

export class AtomTreeDataProvider implements vscode.TreeDataProvider<AtomNode>, vscode.TreeDragAndDropController<AtomNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<AtomNode | undefined> = new vscode.EventEmitter<AtomNode | undefined>;
    public readonly onDidChangeTreeData: vscode.Event<AtomNode | undefined> = this._onDidChangeTreeData.event;
    
    private treeBasePath: string;
    public dragMimeTypes = ['application/vnd.code.tree.atomExplorerView'];
    public dropMimeTypes = ['application/vnd.code.tree.atomExplorerView'];
    private order: {[index: string]: number};

    public constructor(private basePath:string) {
        this.treeBasePath = basePath;

        this.order = {
            [path.join(basePath, "src", "Server")]: 0,
            [path.join(basePath, "src", "Client")]: 1,
            [path.join(basePath, "src", "Systems")]: 2,
            [path.join(basePath, "src", "Modules")]: 3,
            [path.join(basePath, "src", "Systems", "Server")]: 0,
            [path.join(basePath, "src", "Systems", "Client")]: 1,
            [path.join(basePath, "src", "Modules", "Server")]: 0,
            [path.join(basePath, "src", "Modules", "Client")]: 1,

        };

    }

    public getTreeItem = (node: AtomNode): vscode.TreeItem | Thenable<vscode.TreeItem> => {
        return node;
    };

    private sortNodes = (nodes: AtomNode[]): AtomNode[] => {
        const folders: AtomNode[] = [];
        const files: AtomNode[] = [];
        for (const node of nodes) {
            if (node.fileType == fsutil.FsFileType.File || typeof node.initFile !== "undefined") {
                files.push(node);
            } else {
                folders.push(node);
            }

        }
        
        folders.sort((a, b) => a.label.localeCompare(b.label));
        files.sort((a, b) => a.label.localeCompare(b.label));

        return folders.concat(files);

    };

    public getChildren = (node?: AtomNode | undefined): Thenable<AtomNode[]> => {
        const collapsedState = vscode.TreeItemCollapsibleState.Collapsed;
        const noneState = vscode.TreeItemCollapsibleState.None;
        const srcDirectory = path.join(this.basePath, "src");

        if (node) {
            return fsutil.readDir(node.filePath).then(async(filePaths):Promise<AtomNode[]> => {
                const nodePromises: Promise<AtomNode>[] = [];
                for (const filePath of filePaths) {
                    let name = path.basename(filePath);
                    if (name.startsWith("init.") && name.endsWith(".lua")) {continue;}

                    const fullPath = path.join(node.filePath, filePath);
                    const isDirectory = (await fsutil.getFileType(fullPath)) === fsutil.FsFileType.Directory;
                    const initFile = isDirectory ? await fsutil.getInitFile(fullPath) : undefined;
                    if (initFile) {name += ".lua";}

                    const icon = ""; // ADD ICONS
                    nodePromises.push(
                        fsutil.getFileType(fullPath).then((fileType): AtomNode => 
                            new AtomNode(path.parse(name).name, fileType == fsutil.FsFileType.Directory ? collapsedState : noneState, fullPath, fileType, icon, initFile)) // ADD ICONS
                    );

                }

                const result = Promise.all(nodePromises);

                if (typeof this.order[node.filePath] !== "undefined") {
                    return result.then((results) => {
                        if (results[0] && typeof this.order[results[0].filePath] !== "undefined") {
                            return results.sort((a, b): number => (this.order[a.filePath] - this.order[b.filePath]));
                        } else {
                            return this.sortNodes(results);
                        }

                    });

                } else {
                    return result.then((results) => this.sortNodes(results));
                }

            });

        } else {
            return fsutil.readDir(srcDirectory).then(async(filePaths):Promise<AtomNode[]> => {
                const nodePromises: Promise<AtomNode>[] = [];
                for (const filePath of filePaths) {
                    const fullPath = path.join(srcDirectory, filePath);
                    const name = path.basename(filePath);
                    // if (name === "Framework") continue;
                    const icon = ""; // ADD ICONS
                    nodePromises.push(
                        fsutil.getFileType(fullPath).then((fileType): AtomNode =>
                            new AtomNode(path.parse(name).name, fileType == fsutil.FsFileType.Directory ? collapsedState : noneState, fullPath, fileType, "", undefined)) // ADD ICONS
                    );
                }
                return Promise.all(nodePromises).then((results): AtomNode[] => results.sort((a, b): number => (this.order[a.label] - this.order[b.label])));

            });

        }
        
    };

    public handleDrag(source: readonly AtomNode[], dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> | Thenable<void> {
        if (importantNodes[source[0].label]) {
            console.log("Important");

            return Promise.resolve();

        }
        dataTransfer.set('application/vnd.code.tree.atomExplorerView', new vscode.DataTransferItem(source));

        return Promise.resolve();

    }

    public async handleDrop(target: AtomNode | undefined, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
        if (!target) {return;}
        
        const transfer = dataTransfer.get('application/vnd.code.tree.atomExplorerView');
        const source:AtomNode  = transfer?.value[0];
        if (!source) {return;}

        const location = source.filePath;
        // fs.rename(location, path.join(target.filePath, path.basename(location)), console.log);
        vscode.commands.executeCommand("atomexplorer.atomMove", location, target.filePath);

        this.refresh();

    }

    public refresh = (): void => {
        this._onDidChangeTreeData.fire(undefined);
    };

}

export class AtomExplorer {
    private viewer: vscode.TreeView<AtomNode>;
    private dataProvider: AtomTreeDataProvider;
    public selectedNode: AtomNode | null = null;

    public constructor(basePath: string) {
        this.dataProvider = new AtomTreeDataProvider(basePath);
        this.viewer = vscode.window.createTreeView("atomExplorerView", { treeDataProvider: this.dataProvider, dragAndDropController: this.dataProvider });
        this.viewer.onDidChangeSelection((event: vscode.TreeViewSelectionChangeEvent<AtomNode>): void => {
            this.selectedNode = event.selection[0];
            const selection = event.selection[0];
            if (selection && (selection.fileType == fsutil.FsFileType.File || selection.initFile)) {
                vscode.workspace.openTextDocument(selection.initFile || selection.filePath).then((doc): void => {
                    vscode.window.showTextDocument(doc, { preserveFocus: true });
                });
            }
        });

    }

    public refresh = (): void => {
        this.dataProvider.refresh();
    };

}