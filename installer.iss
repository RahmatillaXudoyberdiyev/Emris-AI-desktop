#define MyAppName "Emris AI Desktop"
#define MyAppVersion "1.2.2-beta"
#define MyAppPublisher "Emris AI"
#define MyAppURL "https://github.com/RahmatillaXudoyberdiyev"
#define MyAppExeName "EmrisAI.exe"

[Setup]
AppId={{D37F0288-72AE-4395-B9F8-AC1E627C171F}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\EmrisAI
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=dist
OutputBaseFilename=EmrisAI-Setup-v1.2.2-beta
SetupIconFile=backend\favicon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequiredOverridesAllowed=dialog
UninstallDisplayIcon={app}\{#MyAppExeName}
VersionInfoVersion=1.2.2.0
VersionInfoCompany=Emris AI
VersionInfoDescription=Emris AI Desktop Setup
VersionInfoCopyright=Copyright (C) 2026 Emris AI. All rights reserved.
VersionInfoProductName=Emris AI Desktop

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "dist\EmrisAI\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "backend\favicon.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\favicon.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\favicon.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
