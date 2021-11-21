import { readFile } from 'fs/promises'
import childProcess from 'child_process'

const plainTextProvider = {
  id: 'plainTextProvider',
  providesItemsForTypes: ['public.plain-text'],
  async run({ path }) {
    const file = await readFile(path, { encoding: 'utf8' })
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
    console.log(direct)
  },
}

export const providers = [plainTextProvider]
export const actions = [copyToClipboardAction]
