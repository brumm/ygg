import { extname } from 'path'
import { promisify } from 'util'
import childProcess from 'child_process'

const contentTypesByExtensionCache = {}

export const fileMetadata = async (filePath) => {
  const { stdout } = await promisify(childProcess.execFile)('mdls', [
    '-name',
    'kMDItemContentTypeTree',
    filePath,
  ])

  const lines = stdout
    .trim()
    .replaceAll('"', '')
    .replaceAll(',', '')
    .split('\n')
    .slice(1, -1)
    .map((line) => line.trim())

  return lines
}

const getFileMetadata = async (filePath) => {
  const fileExtension = extname(filePath).slice(1)

  if (fileExtension.length > 0) {
    if (fileExtension in contentTypesByExtensionCache) {
      return contentTypesByExtensionCache[fileExtension]
    }
  }

  const contentTypes = await fileMetadata(filePath)
  contentTypesByExtensionCache[fileExtension] = contentTypes
  return contentTypes
}

export default getFileMetadata
