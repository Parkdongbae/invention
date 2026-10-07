# 발명 도우미 교사용 단독 exe 빌드 스크립트
# 사용법: powershell -File teacher-exe\build.ps1  (app/dist가 먼저 빌드되어 있어야 함)
$ErrorActionPreference = 'Stop'

$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) { $csc = "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe" }
if (-not (Test-Path $csc)) { throw "csc.exe를 찾을 수 없습니다 (.NET Framework 필요)" }

$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root "app\dist"
$outDir = $PSScriptRoot

if (-not (Test-Path $dist)) { throw "app\dist가 없습니다. 먼저 'npm run build'를 실행하세요." }

# 1) dist 파일 스캔 → 임베디드 리소스 인자 + 매핑 코드 생성
$files = Get-ChildItem $dist -Recurse -File | Sort-Object FullName
$distPath = (Resolve-Path $dist).Path
$resArgs = @()
$names = @()
$paths = @()
$i = 0
foreach ($f in $files) {
    $rel = $f.FullName.Substring($distPath.Length + 1).Replace('\', '/')
    $resName = "R$i"
    $resArgs += "/res:`"$($f.FullName)`",$resName"
    $names += $resName
    $paths += $rel
    $i++
}

$quotedNames = ($names | ForEach-Object { '"' + $_ + '"' }) -join ', '
$quotedPaths = ($paths | ForEach-Object { '"' + $_ + '"' }) -join ', '
$generated = @"
static class EmbeddedNames { public static readonly string[] Values = new string[] { $quotedNames }; }
static class EmbeddedPaths { public static readonly string[] Values = new string[] { $quotedPaths }; }
"@
[System.IO.File]::WriteAllText((Join-Path $outDir "GeneratedResources.cs"), $generated, (New-Object System.Text.UTF8Encoding $true))

# 2) 컴파일 (ASCII 임시명 → 한글 최종명 복사)
$tmpExe = Join-Path $outDir "InventionTeacher.exe"
if (Test-Path $tmpExe) { Remove-Item $tmpExe -Force }

& $csc /nologo /codepage:65001 /target:exe /platform:anycpu /out:"$tmpExe" $resArgs (Join-Path $outDir "Program.cs") (Join-Path $outDir "GeneratedResources.cs")
if ($LASTEXITCODE -ne 0) { throw "컴파일 실패 (exit $LASTEXITCODE)" }

$finalExe = Join-Path $outDir "발명도우미_교사용.exe"
Copy-Item $tmpExe $finalExe -Force

$sizeKb = [math]::Round((Get-Item $finalExe).Length / 1KB, 1)
Write-Output "BUILD OK: $finalExe ($sizeKb KB, 내장 파일 $($files.Count)개)"
