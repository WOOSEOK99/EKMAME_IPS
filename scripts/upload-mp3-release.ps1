<#
.SYNOPSIS
  Uploads MP3 files that have matching non-empty MNG files to GitHub Releases.

.DESCRIPTION
  MP3 and MNG files are both read from EKMAME_IPS/MNG, beside the scripts folder.
  Only non-empty MP3 files whose matching MNG is non-empty are eligible.

  A normal run only prints a local inventory. -Upload transfers files into
  draft releases; -Upload -Publish also publishes the completed drafts.
  Existing release assets are checked so an interrupted upload can be resumed.

.EXAMPLE
  .\scripts\upload-mp3-release.ps1
.EXAMPLE
  .\scripts\upload-mp3-release.ps1 -Upload
.EXAMPLE
  .\scripts\upload-mp3-release.ps1 -Upload -Publish
#>

[CmdletBinding()]
param(
    [switch]$Upload,
    [switch]$Publish,
    [ValidateRange(1, 900)][int]$MaxAssetsPerRelease = 400
)

$ErrorActionPreference = 'Stop'
$repository = 'WOOSEOK99/EKMAME_IPS'
$repoRoot = Split-Path -Parent $PSScriptRoot
$mngRoot = Join-Path $repoRoot 'MNG'

if ($Publish -and -not $Upload) {
    throw 'Publishing requires both -Upload and -Publish.'
}
if (-not (Test-Path -LiteralPath $mngRoot -PathType Container)) {
    throw "MNG folder not found: $mngRoot"
}

$mp3Files = @(Get-ChildItem -LiteralPath $mngRoot -Recurse -File |
    Where-Object { $_.Extension -ieq '.mp3' } |
    Sort-Object -Property FullName)
if ($mp3Files.Count -eq 0) {
    throw "No MP3 files found under $mngRoot"
}

$missingMng = @()
$zeroMng = @()
$zeroMp3 = @()
$files = @()
foreach ($mp3 in $mp3Files) {
    # A valid MP3 must have a non-empty MNG with the same basename and directory.
    $mngPath = [System.IO.Path]::ChangeExtension($mp3.FullName, '.mng')
    $mng = Get-Item -LiteralPath $mngPath -ErrorAction SilentlyContinue
    if ($null -eq $mng -or $mng.PSIsContainer) {
        $missingMng += $mp3.Name
        continue
    }
    if ($mng.Length -eq 0) {
        $zeroMng += $mp3.Name
        continue
    }
    if ($mp3.Length -eq 0) {
        $zeroMp3 += $mp3.Name
        continue
    }
    $files += $mp3
}
if ($missingMng.Count -gt 0) {
    Write-Warning ("Skipping MP3 without a matching MNG: " + ($missingMng -join ', '))
}
if ($zeroMng.Count -gt 0) {
    Write-Warning ("Skipping MP3 paired with zero-byte MNG: " + ($zeroMng -join ', '))
}
if ($zeroMp3.Count -gt 0) {
    Write-Warning ("Skipping zero-byte MP3: " + ($zeroMp3 -join ', '))
}
if ($files.Count -eq 0) {
    throw 'No non-empty MP3 files with matching non-empty MNG files were found.'
}

$tooLarge = @($files | Where-Object { $_.Length -ge 2GB })
if ($tooLarge.Count -gt 0) {
    $tooLarge | ForEach-Object { Write-Warning "2 GiB or larger: $($_.FullName)" }
    throw 'GitHub Releases requires each asset to be smaller than 2 GiB.'
}

# Release assets have no directory hierarchy. Never silently rename or overwrite
# files with the same basename from different local folders.
$duplicates = @($files | Group-Object -Property Name | Where-Object { $_.Count -gt 1 })
if ($duplicates.Count -gt 0) {
    $duplicates | ForEach-Object { Write-Warning "Duplicate MP3 filename: $($_.Name)" }
    throw 'Resolve duplicate MP3 filenames before uploading.'
}

$sum = ($files | Measure-Object -Property Length -Sum).Sum
Write-Host "Repository: $repository"
Write-Host "MP3 files found: $($mp3Files.Count)"
Write-Host "MNG/MP3 folder: $mngRoot"
Write-Host "Paired MP3 files: $($files.Count)"
Write-Host ("Total: {0:N2} GiB" -f ($sum / 1GB))
Write-Host "Release asset limit for this script: $MaxAssetsPerRelease"

if (-not $Upload) {
    Write-Host 'Inventory only; nothing was uploaded or changed.'
    Write-Host 'Run again with -Upload to add assets to draft releases.'
    exit 0
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw 'GitHub CLI (gh) is not installed. Install it, then run gh auth login.'
}
& gh auth status --hostname github.com | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw 'GitHub CLI is not authenticated. Run gh auth login first.'
}

$listingText = & gh release list --repo $repository --limit 1000 --json tagName,isDraft
if ($LASTEXITCODE -ne 0) {
    throw 'Could not list GitHub releases.'
}
$listing = @(($listingText -join "`n") | ConvertFrom-Json)
$mp3Releases = @($listing | Where-Object { $_.tagName -match '^mp3-[0-9]{3}$' } |
    Sort-Object -Property tagName)

$existing = @{}
$drafts = @()
$nextNumber = 0
foreach ($release in $mp3Releases) {
    $number = [int]($release.tagName.Substring(4))
    if ($number -gt $nextNumber) { $nextNumber = $number }

    $detailText = & gh release view $release.tagName --repo $repository --json databaseId
    if ($LASTEXITCODE -ne 0) {
        throw "Could not inspect release $($release.tagName)."
    }
    $releaseId = (($detailText -join "`n") | ConvertFrom-Json).databaseId
    $assetList = @()
    $page = 1
    do {
        $assetText = & gh api "repos/$repository/releases/$releaseId/assets?per_page=100&page=$page"
        if ($LASTEXITCODE -ne 0) {
            throw "Could not list assets for $($release.tagName), page $page."
        }
        # Normalize JSON array output across Windows PowerShell and PowerShell 7.
        $pageAssets = @()
        foreach ($parsedAsset in (($assetText -join "`n") | ConvertFrom-Json)) {
            $pageAssets += $parsedAsset
        }
        $assetList += $pageAssets
        $page++
    } while ($pageAssets.Count -eq 100)
    foreach ($asset in $assetList) {
        if ($existing.ContainsKey($asset.name)) {
            throw "The remote MP3 asset name is duplicated across releases: $($asset.name)"
        }
        $existing[$asset.name] = [pscustomobject]@{
            Size = [long]$asset.size
            Tag = $release.tagName
            IsDraft = [bool]$release.isDraft
        }
    }
    if ($release.isDraft -and $assetList.Count -lt $MaxAssetsPerRelease) {
        $drafts += [pscustomobject]@{
            Tag = $release.tagName
            Count = $assetList.Count
        }
    }
}

$skipCount = 0
$uploadCount = 0
$publishCandidates = @{}
foreach ($file in $files) {
    if ($existing.ContainsKey($file.Name)) {
        $remote = $existing[$file.Name]
        if ($remote.Size -ne $file.Length) {
            throw "Remote asset differs in size: $($file.Name) ($($remote.Tag)). No overwrite was attempted."
        }
        $skipCount++
        if ($remote.IsDraft) { $publishCandidates[$remote.Tag] = $true }
        continue
    }

    $target = @($drafts | Where-Object { $_.Count -lt $MaxAssetsPerRelease } |
        Select-Object -First 1)
    if ($target.Count -eq 0) {
        $nextNumber++
        $tag = 'mp3-{0:D3}' -f $nextNumber
        Write-Host "Creating draft release: $tag"
        & gh release create $tag --repo $repository --draft --title "EKMAME MP3 $tag" --notes 'MP3 audio paired with MNG recordings for EKMAME. Uploaded via upload-mp3-release.ps1.'
        if ($LASTEXITCODE -ne 0) {
            throw "Could not create draft release: $tag"
        }
        $newDraft = [pscustomobject]@{ Tag = $tag; Count = 0 }
        $drafts += $newDraft
    } else {
        $newDraft = $target[0]
        $tag = $newDraft.Tag
    }

    $ok = $false
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        Write-Host "Uploading [$($uploadCount + 1)]: $($file.Name) -> $tag (try $attempt/3)"
        & gh release upload $tag $file.FullName --repo $repository
        if ($LASTEXITCODE -eq 0) {
            $ok = $true
            break
        }
        if ($attempt -lt 3) { Start-Sleep -Seconds (2 * $attempt) }
    }
    if (-not $ok) {
        throw "Upload failed: $($file.FullName). Uploaded drafts are kept; rerun to resume."
    }
    $newDraft.Count++
    $uploadCount++
    $publishCandidates[$tag] = $true
}

Write-Host "Complete. Uploaded: $uploadCount, already present: $skipCount"
if ($Publish) {
    foreach ($tag in @($publishCandidates.Keys | Sort-Object)) {
        Write-Host "Publishing: $tag"
        & gh release edit $tag --repo $repository --draft=false
        if ($LASTEXITCODE -ne 0) {
            throw "Publishing failed for $tag. Check the release on GitHub."
        }
    }
    Write-Host 'Selected draft releases have been published.'
} else {
    Write-Host 'Assets remain in draft releases. Review them first.'
    Write-Host 'When ready, rerun with -Upload -Publish to publish.'
}
