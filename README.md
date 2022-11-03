# Atom Framework VS Code Extension

## Usage
Using this framework requires [Rojo]('https://rojo.space/') to sync the local files with Roblox Studio.
Currently, the `Atom Explorer: Initialize` command does not work. You can instead start by cloning the [template]('https://github.com/Kazisitoe/KaziFrameworkTemplate').
If the explorer is empty, click `⟳ Refresh` on the top bar.

## Structure
  | ``Framework``: Where all the scripts that handle the framework are
  | ``Packages`` Where all the dependencies are
  | ``src``: Where all the user-made scripts are
    | ``Client``: Client sided scripts
    | ``Server``: Client sided scripts
    | ``Components``: Lists of components used by ECS
    | ``Remotes``: List of RemoteEvents and RemoteFunctions
    | ``Systems``: Where all the ECS systems are
      | ``Server``: Server-sided systems
      | ``Client``: Client-sided systems
      | ``Shared``: Systems ran by both client and server
    | ``Modules``: Where all the ECS systems are
      | ``Server``: Server-sided modules
      | ``Client``: Client-sided modules
      | ``Shared``: Modules ran by both client and server

## Future updates
- Initialize command
- Undo history

## Acknowledgements
[LPGhatguy]('https://github.com/LPGhatguy') - Rojo
[Sleitnick]('https://github.com/Sleitnick') - AeroGameFramework Extension, which this extension is based on