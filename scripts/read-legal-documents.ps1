param([string]$SourceRoot = (Join-Path $PSScriptRoot '..\..'))

# Read-only DOCX extraction. JSON is emitted to stdout; source documents are never modified.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$wordNamespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

function Read-Paragraph($Paragraph, $Namespaces) {
    $runs = @()
    foreach ($run in $Paragraph.SelectNodes('.//w:r', $Namespaces)) {
        $text = ''
        foreach ($part in $run.ChildNodes) {
            switch ($part.LocalName) {
                't' { $text += $part.InnerText }
                'tab' { $text += ' ' }
                'br' { $text += "`n" }
            }
        }
        if ($text) {
            $item = [ordered]@{ text = $text }
            $bold = $run.SelectSingleNode('w:rPr/w:b', $Namespaces)
            $underline = $run.SelectSingleNode('w:rPr/w:u', $Namespaces)
            if ($bold -and $bold.GetAttribute('val', $wordNamespace) -notin @('0', 'false', 'off')) { $item.bold = $true }
            if ($underline -and $underline.GetAttribute('val', $wordNamespace) -ne 'none') { $item.underline = $true }
            $runs += $item
        }
    }
    return ,$runs
}

$documents = @()
foreach ($definition in @(
    @{ id = 'service'; file = '乐搭伴用户服务协议.docx'; navTitle = '用户服务协议' },
    @{ id = 'privacy'; file = '乐搭伴用户隐私政策.docx'; navTitle = '隐私政策' },
    @{ id = 'closure'; file = '乐搭伴用户账号注销协议.docx'; navTitle = '账号注销协议' }
)) {
    $sourcePath = Join-Path $SourceRoot $definition.file
    $archive = [System.IO.Compression.ZipFile]::OpenRead($sourcePath)
    try {
        $reader = [System.IO.StreamReader]::new($archive.GetEntry('word/document.xml').Open())
        try { [xml]$document = $reader.ReadToEnd() } finally { $reader.Dispose() }
        $namespaces = [System.Xml.XmlNamespaceManager]::new($document.NameTable)
        $namespaces.AddNamespace('w', $wordNamespace)
        $body = $document.SelectSingleNode('//w:body', $namespaces)
        $blocks = @()
        $title = ''
        $effectiveLabel = ''
        $sourceContents = @()
        foreach ($element in $body.ChildNodes) {
            $blockId = '{0}-block-{1}' -f $definition.id, $blocks.Count
            if ($element.LocalName -eq 'p') {
                $runs = Read-Paragraph $element $namespaces
                $text = ($runs | ForEach-Object { $_.text }) -join ''
                if (-not $text.Trim()) { continue }
                if (-not $title) { $title = $text; continue }
                if ($text -match '^生效(时间|日期)：') { $effectiveLabel = $text; continue }
                if ($text -eq '本隐私政策目录如下：') {
                    # The source's manual TOC is outdated. Preserve it as provenance;
                    # the reader builds navigation from the actual body headings.
                    $sourceContents += $text
                    continue
                }
                if ($definition.id -eq 'privacy' -and $sourceContents.Count -gt 0 -and $sourceContents.Count -lt 13) {
                    $sourceContents += $text
                    continue
                }
                if ($text -match '^[一二三四五六七八九十]+、') {
                    $blocks += [ordered]@{ kind = 'heading'; id = $blockId; text = $text }
                } else {
                    $blocks += [ordered]@{ kind = 'paragraph'; id = $blockId; runs = $runs }
                }
            } elseif ($element.LocalName -eq 'tbl') {
                $rows = @()
                foreach ($row in $element.SelectNodes('w:tr', $namespaces)) {
                    $cells = @()
                    foreach ($cell in $row.SelectNodes('w:tc', $namespaces)) {
                        $parts = @($cell.SelectNodes('.//w:p', $namespaces) | ForEach-Object {
                            ((Read-Paragraph $_ $namespaces) | ForEach-Object { $_.text }) -join ''
                        })
                        $cells += ($parts -join "`n")
                    }
                    $rows += ,$cells
                }
                $header = $rows[0][0] -in @('订单类型', '业务场景', '是否嵌入第三方代码、插件传输个人信息', '产品名称')
                $blocks += [ordered]@{ kind = 'table'; id = $blockId; hasHeader = $header; rows = $rows }
            }
        }
        $documents += [ordered]@{
            id = $definition.id
            title = $title
            navTitle = $definition.navTitle
            effectiveLabel = $effectiveLabel
            sourceFile = $definition.file
            sourceSha256 = (Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash.ToLowerInvariant()
            sourceContents = $sourceContents
            blocks = $blocks
        }
    } finally { $archive.Dispose() }
}
ConvertTo-Json -InputObject $documents -Depth 20 -Compress
