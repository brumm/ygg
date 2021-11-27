import { readFile } from 'fs/promises'
import clipboard from 'clipboardy'

const plainTextProvider = {
  id: 'plainTextProvider',
  inputTypes: ['public.plain-text', 'utf-8'],
  async run({ path }) {
    const file = await readFile(path, { encoding: 'utf-8' })
    const lines = file.split('\n')

    const lineItems = []
    for (const lineIndex in lines) {
      const line = lines[lineIndex]

      if (line.trim().length === 0) {
        continue
      }

      lineItems.push({
        name: line,
        types: ['text/plain'],
        meta: {
          index: parseInt(lineIndex, 10),
          text: line,
          path,
        },
      })
    }

    return lineItems
  },
}

const copyToClipboardAction = {
  types: ['action'],
  directTypes: ['text/plain'],
  name: 'Copy to Clipboard',
  run: (direct) => {
    // TODO items should probably be stringifyable
    clipboard.writeSync(direct.name)
  },
}

export const providers = [plainTextProvider]
export const actions = [copyToClipboardAction]
