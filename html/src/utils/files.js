/**
 * Browser file helpers: the file dialog and downloads.
 */

/**
 * Opens the file dialog and resolves with the chosen File, or null if none was chosen.
 * Call it from a click — browsers only open file dialogs on a user gesture.
 */
export function pickFile(accept) {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type     = 'file'
    input.accept   = accept
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.oncancel = () => resolve(null)
    input.click()
  })
}

/** Hands `content` to the browser as a file download. */
export function downloadFile(name, content, type = 'application/octet-stream') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  Object.assign(document.createElement('a'), { href: url, download: name }).click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
