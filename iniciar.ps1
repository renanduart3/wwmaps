#requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$Stop,
    [switch]$OpenBrowser,
    [ValidateRange(1024,65535)][int]$Port = 4321
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath($PSScriptRoot).TrimEnd([char]92)
$webRoot = Join-Path $projectRoot 'apps\web'
$runtimeRoot = Join-Path $projectRoot '.studio\runtime'
$stateFile = Join-Path $runtimeRoot 'launcher.json'
$reservedPorts = @(4321,8788,8789,$Port) | Select-Object -Unique
$launcherMutex = $null
$ownsMutex = $false
$runtimeJob = $null
$launcherExit = 0
$ownerStamp = $null

function Get-ProcessSnapshot { @(Get-CimInstance Win32_Process -ErrorAction Stop) }
function Get-Stamp($ProcessInfo) { $ProcessInfo.CreationDate.ToUniversalTime().Ticks.ToString() }
function Get-PortOwners {
    @(Get-NetTCPConnection -State Listen -ErrorAction Stop |
        Where-Object { $_.LocalPort -in $reservedPorts } |
        Select-Object -ExpandProperty OwningProcess -Unique)
}
function Get-ProtectedProcesses($Snapshot) {
    $result = @([int]$PID)
    $cursor = [int]$PID
    for ($depth = 0; $depth -lt 30; $depth++) {
        $entry = $Snapshot | Where-Object { $_.ProcessId -eq $cursor } | Select-Object -First 1
        if (-not $entry -or -not $entry.ParentProcessId -or $entry.ParentProcessId -in $result) { break }
        $cursor = [int]$entry.ParentProcessId
        $result += $cursor
    }
    $result
}
function Stop-ProcessTree([int]$TargetProcessId, [string]$Reason) {
    if ($TargetProcessId -le 4 -or $TargetProcessId -in $script:protectedProcesses) {
        throw "Nao e seguro encerrar o PID $TargetProcessId ($Reason). A porta continua ocupada."
    }
    if (-not (Get-Process -Id $TargetProcessId -ErrorAction SilentlyContinue)) { return }
    Write-Host "Encerrando PID $TargetProcessId - $Reason"
    $taskkillPath = Join-Path $env:SystemRoot 'System32\taskkill.exe'
    $nativePreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $taskkillPath /PID $TargetProcessId /T /F *> $null
        $killResult = $LASTEXITCODE
    } finally { $ErrorActionPreference = $nativePreference }
    if ($killResult -ne 0 -and (Get-Process -Id $TargetProcessId -ErrorAction SilentlyContinue)) {
        throw "Nao foi possivel encerrar o PID $TargetProcessId. Verifique as permissoes desse processo."
    }
}
function Stop-PreviousLauncher {
    if (-not (Test-Path -LiteralPath $stateFile)) { return }
    try { $state = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json }
    catch { return }
    if (-not $state.ownerPid -or -not $state.ownerStamp) { return }
    $previous = Get-CimInstance Win32_Process -Filter "ProcessId = $([int]$state.ownerPid)" -ErrorAction Stop
    if (-not $previous) { return }
    if ([string]$state.root -ne $projectRoot -or
        (Get-Stamp $previous) -ne [string]$state.ownerStamp -or
        $previous.Name -notmatch '^(powershell|pwsh)\.exe$' -or
        -not $previous.CommandLine -or
        $previous.CommandLine -notmatch '(?i)(?:^|\s)-File\s+(?:"[^"]*iniciar\.ps1"|[^\s]*iniciar\.ps1)(?:\s|$)') { return }
    if ($state.PSObject.Properties['ownerCommandLine'] -and $previous.CommandLine -ne [string]$state.ownerCommandLine) { return }
    Stop-ProcessTree ([int]$previous.ProcessId) 'inicializador anterior deste projeto'
}
function Stop-ProjectRuntimes {
    $snapshot = Get-ProcessSnapshot
    $rootPattern = [regex]::Escape($projectRoot.Replace([char]92,[char]47)) + '(?:/|["\s]|$)'
    foreach ($entry in $snapshot) {
        if ($entry.ProcessId -in $script:protectedProcesses -or -not $entry.CommandLine) { continue }
        $command = $entry.CommandLine.Replace([char]92,[char]47)
        $runtime = $entry.Name -match '^(node|python|pythonw|workerd|esbuild|wrangler)(\.exe)?$'
        if ($runtime -and $command -match $rootPattern -and
            $command -match '(?i)astro|wrangler|workerd|esbuild|responsive-preview|http\.server') {
            Stop-ProcessTree ([int]$entry.ProcessId) 'runtime antigo do WWMaps'
        }
    }
    foreach ($owner in @(Get-PortOwners)) {
        Stop-ProcessTree ([int]$owner) "porta reservada do projeto ($($reservedPorts -join ', '))"
    }
    $deadline = [DateTime]::UtcNow.AddSeconds(10)
    do {
        $remaining = @(Get-PortOwners)
        if ($remaining.Count -eq 0) { return }
        Start-Sleep -Milliseconds 200
    } while ([DateTime]::UtcNow -lt $deadline)
    throw "Portas ainda ocupadas pelos PIDs $($remaining -join ', '). Nenhuma nova instancia foi iniciada."
}
function Add-RuntimeJobType {
    if ('WWMapsRuntimeJob' -as [type]) { return }
    Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
public sealed class WWMapsRuntimeJob : IDisposable {
    [StructLayout(LayoutKind.Sequential)] struct Basic {
        public long ProcessTime, JobTime;
        public uint Flags;
        public UIntPtr MinWorkingSet, MaxWorkingSet;
        public uint ActiveProcesses;
        public UIntPtr Affinity;
        public uint Priority, Scheduling;
    }
    [StructLayout(LayoutKind.Sequential)] struct Io {
        public ulong ReadOps, WriteOps, OtherOps, ReadBytes, WriteBytes, OtherBytes;
    }
    [StructLayout(LayoutKind.Sequential)] struct Extended {
        public Basic Limits;
        public Io Counters;
        public UIntPtr ProcessMemory, JobMemory, PeakProcessMemory, PeakJobMemory;
    }
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr CreateJobObject(IntPtr security, string name);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job, int kind, IntPtr info, uint size);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool IsProcessInJob(IntPtr process, IntPtr job, out bool result);
    [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr OpenProcess(uint rights, bool inherit, int pid);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
    IntPtr job;
    public WWMapsRuntimeJob() {
        job = CreateJobObject(IntPtr.Zero, null);
        if (job == IntPtr.Zero) throw new Win32Exception();
        var limits = new Extended(); limits.Limits.Flags = 0x2000; // KILL_ON_JOB_CLOSE
        int size = Marshal.SizeOf(typeof(Extended)); IntPtr memory = Marshal.AllocHGlobal(size);
        try {
            Marshal.StructureToPtr(limits, memory, false);
            if (!SetInformationJobObject(job, 9, memory, (uint)size)) {
                int error = Marshal.GetLastWin32Error(); Dispose(); throw new Win32Exception(error);
            }
        } finally { Marshal.FreeHGlobal(memory); }
    }
    public void Attach(int pid) {
        IntPtr process = OpenProcess(0x1101, false, pid); // QUERY_LIMITED_INFORMATION | SET_QUOTA | TERMINATE
        if (process == IntPtr.Zero) throw new Win32Exception();
        try {
            bool attached;
            if (!IsProcessInJob(process, job, out attached)) throw new Win32Exception();
            if (!attached && !AssignProcessToJobObject(job, process)) throw new Win32Exception();
        }
        finally { CloseHandle(process); }
    }
    public void Dispose() { if (job != IntPtr.Zero) { CloseHandle(job); job = IntPtr.Zero; } }
}
'@
}
function Start-ManagedNode([string[]]$NodeArguments, [string]$LogName) {
    # These arguments are fixed paths/flags, never generated shell commands.
    $quoted = @($NodeArguments | ForEach-Object { '"' + $_ + '"' }) -join ' '
    $child = Start-Process -FilePath $script:nodeExecutable -ArgumentList $quoted -WorkingDirectory $webRoot `
        -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $runtimeRoot "$LogName.out.log") `
        -RedirectStandardError (Join-Path $runtimeRoot "$LogName.err.log")
    # Windows PowerShell 5.1 needs the process handle retained to report ExitCode reliably.
    $null = $child.Handle
    try {
        if (-not $child.HasExited) { $runtimeJob.Attach($child.Id) }
        # Also attach any child created just before its parent entered the job.
        $children = @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $($child.Id)" -ErrorAction Stop)
        foreach ($entry in $children) {
            if (Get-Process -Id $entry.ProcessId -ErrorAction SilentlyContinue) { $runtimeJob.Attach([int]$entry.ProcessId) }
        }
    } catch {
        Stop-ProcessTree $child.Id 'falha ao vincular o runtime a janela'
        throw
    }
    return $child
}
function Show-FailureLog([string]$LogName) {
    foreach ($suffix in @('err','out')) {
        $file = Join-Path $runtimeRoot "$LogName.$suffix.log"
        if (Test-Path -LiteralPath $file) { Get-Content -LiteralPath $file -Tail 12 | Write-Host }
    }
}
function Test-LocalServer([string]$Url) {
    $response = $null
    try {
        $request = [Net.HttpWebRequest]::Create($Url)
        $request.Proxy = $null
        $request.Timeout = 1200
        $request.KeepAlive = $false
        $response = $request.GetResponse()
        return [int]$response.StatusCode -eq 200
    } catch { return $false }
    finally { if ($response) { $response.Close() } }
}

try {
    if ($env:OS -ne 'Windows_NT') { throw 'Este inicializador usa o gerenciamento de processos do Windows.' }
    $snapshot = Get-ProcessSnapshot
    $script:protectedProcesses = @(Get-ProtectedProcesses $snapshot)
    New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
    $digest = [Security.Cryptography.SHA256]::Create()
    try { $key = [BitConverter]::ToString($digest.ComputeHash([Text.Encoding]::UTF8.GetBytes($projectRoot.ToLowerInvariant()))).Replace('-','').Substring(0,20) }
    finally { $digest.Dispose() }
    $launcherMutex = New-Object Threading.Mutex($false,"Local\WWMaps-$key")
    try { $ownsMutex = $launcherMutex.WaitOne(0) }
    catch [Threading.AbandonedMutexException] { $ownsMutex = $true }
    if (-not $ownsMutex) {
        # The previous owner writes its identity immediately after acquiring the mutex.
        $deadline = [DateTime]::UtcNow.AddSeconds(10)
        do {
            Stop-PreviousLauncher
            try { $ownsMutex = $launcherMutex.WaitOne(300) }
            catch [Threading.AbandonedMutexException] { $ownsMutex = $true }
        } while (-not $ownsMutex -and [DateTime]::UtcNow -lt $deadline)
        if (-not $ownsMutex) { throw 'Outro inicializador esta ativo e nao pode ser encerrado com seguranca.' }
    }
    $owner = $snapshot | Where-Object { $_.ProcessId -eq $PID } | Select-Object -First 1
    $ownerStamp = Get-Stamp $owner
    @{ownerPid=$PID;ownerStamp=$ownerStamp;ownerCommandLine=$owner.CommandLine;root=$projectRoot;port=$Port} | ConvertTo-Json | Set-Content -LiteralPath $stateFile -Encoding UTF8
    Write-Host 'WWMaps - limpando instancias e portas locais...'
    Stop-ProjectRuntimes
    if ($Stop) { Write-Host 'WWMaps parado. Portas liberadas e nenhuma nova instancia iniciada.'; return }

    $nodeCandidates = @()
    $pathNode = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($pathNode) { $nodeCandidates += $pathNode.Source }
    if ($env:USERPROFILE) {
        $nodeCandidates += Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
    }
    $script:nodeExecutable = $null
    foreach ($candidate in ($nodeCandidates | Select-Object -Unique)) {
        if (-not (Test-Path -LiteralPath $candidate)) { continue }
        $versionText = (& $candidate --version).Trim().TrimStart('v')
        if ([version]$versionText -ge [version]'22.19.0') { $script:nodeExecutable = $candidate; break }
    }
    if (-not $script:nodeExecutable) { throw 'Nenhum Node compativel encontrado. Instale Node 22.19 ou superior.' }
    Write-Host "Node $versionText - $script:nodeExecutable"
    $astroEntry = Join-Path $projectRoot 'node_modules\astro\astro.js'
    if (-not (Test-Path -LiteralPath $astroEntry) -or -not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules\tsx'))) {
        throw 'Dependencias ausentes. Execute npm ci na raiz e abra iniciar.cmd novamente.'
    }
    Add-RuntimeJobType
    $runtimeJob = New-Object WWMapsRuntimeJob
    Write-Host 'Preparando dados e previews locais...'
    $prepare = Start-ManagedNode @('--import','tsx',(Join-Path $webRoot 'scripts\prepare.ts'),'--drafts') 'prepare'
    while (-not $prepare.WaitForExit(300)) { }
    $prepare.WaitForExit()
    if ($prepare.ExitCode -ne 0) { Show-FailureLog 'prepare'; throw "Preparacao falhou (codigo $($prepare.ExitCode))." }
    Write-Host "Iniciando uma unica instancia na porta $Port..."
    $server = Start-ManagedNode @($astroEntry,'dev','--host','127.0.0.1','--port',"$Port") 'dev'
    $siteUrl = "http://127.0.0.1:$Port/"
    $deadline = [DateTime]::UtcNow.AddSeconds(90)
    $ready = $false
    do {
        if ($server.HasExited) { Show-FailureLog 'dev'; throw "Servidor encerrou antes de iniciar (codigo $($server.ExitCode))." }
        if (Test-LocalServer $siteUrl) { $ready = $true; break }
        Start-Sleep -Milliseconds 250
    } while ([DateTime]::UtcNow -lt $deadline)
    if (-not $ready) { Show-FailureLog 'dev'; throw 'O servidor nao respondeu dentro de 90 segundos.' }
    $owners = @(Get-PortOwners)
    if ($server.Id -notin $owners) { throw 'A porta foi ocupada por outro processo durante a inicializacao.' }
    Write-Host "`nSite: $siteUrl"
    Write-Host "Plan: $($siteUrl)__studio/"
    Write-Host 'Feche esta janela ou use Ctrl+C para encerrar o servidor e seus filhos.'
    Write-Host 'Para parar por outra janela: iniciar.cmd stop'
    if ($OpenBrowser) { Start-Process -FilePath $siteUrl }
    while (-not $server.WaitForExit(500)) { }
    if ($server.ExitCode -ne 0) { Show-FailureLog 'dev'; throw "Servidor encerrado com codigo $($server.ExitCode)." }
} catch {
    $launcherExit = 1
    Write-Host "`nFalha: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # Windows also closes this handle if the terminal or launcher is forcibly closed.
    if ($runtimeJob) { $runtimeJob.Dispose() }
    if ($ownsMutex -and (Test-Path -LiteralPath $stateFile)) {
        try {
            $state = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
            if ([int]$state.ownerPid -eq $PID -and [string]$state.ownerStamp -eq $ownerStamp) { Remove-Item -LiteralPath $stateFile -Force }
        } catch { }
    }
    if ($ownsMutex -and $launcherMutex) { $launcherMutex.ReleaseMutex() }
    if ($launcherMutex) { $launcherMutex.Dispose() }
}
exit $launcherExit
