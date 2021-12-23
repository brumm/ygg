import { extname } from 'path'
import { promisify } from 'util'
import childProcess from 'child_process'
import { parse } from 'fast-plist'

const fileUtisByExtension = async (filePaths) => {
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
    const fileExtension = extname(fileName).slice(1).toLowerCase()
    typesByExtension[fileExtension || fileName] = types
  }

  return typesByExtension
}

export default fileUtisByExtension
