import { extname } from 'path'
import { promisify } from 'util'
import childProcess from 'child_process'
import { parse } from 'fast-plist'

export const fileUtisByExtension = async (filePaths) => {
  const { stdout: plistString } = await promisify(childProcess.execFile)(
    'mdls',
    [
      '-name',
      'kMDItemContentTypeTree',
      '-name',
      'kMDItemFSName',
      ...filePaths,
      '-plist',
      '-',
    ],
  )

  let plist = parse(plistString)
  plist = Array.isArray(plist) ? plist : [plist]
  const typesByExtension = {}

  for (const {
    kMDItemFSName: fileName,
    kMDItemContentTypeTree: types,
  } of plist) {
    const fileExtension = extname(fileName).slice(1).toLowerCase() || '@@folder'
    typesByExtension[fileExtension] = types
  }

  return typesByExtension
}

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

const contentTypesByExtensionCache = {}
const getFileMetadata = async (filePath) => {
  const fileExtension = extname(filePath).slice(1).toLowerCase()

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
