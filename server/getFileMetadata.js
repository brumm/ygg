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
  const fileExtention = extname(filePath).slice(1)

  if (fileExtention.length > 0) {
    if (fileExtention in contentTypesByExtensionCache) {
      return contentTypesByExtensionCache[fileExtention]
    }
  }

  const contentTypes = await fileMetadata(filePath)
  contentTypesByExtensionCache[fileExtention] = contentTypes
  return contentTypes
}

export default getFileMetadata
