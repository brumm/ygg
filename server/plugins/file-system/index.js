import { readdir } from 'fs/promises'
import { basename, extname, join } from 'path'
import os from 'os'
import childProcess from 'child_process'
import { fileIconToBuffer } from 'file-icon'
import expandTilde from 'expand-tilde'
import mime from 'mime-types'

import fileUtisByExtension from './getFileMetadata.js'

const denyList = ['.Trash']

// TODO
// import { watch } from 'fs'

const folderItemsProvider = {
  id: 'folderProvider',
  inputTypes: ['public.folder', 'com.apple.application'],
  outputTypes: ['public.folder', 'public.item'],

  async getIcon({ path }) {
    return fileIconToBuffer(path, { size: 128 })
  },

  async makeProviderItem({ path }) {
    const expandedPath = expandTilde(path)

    return {
      name: basename(expandedPath),
      detail: expandedPath.replace(os.homedir(), '~'),
      // TODO this should probably be a class instance so we can self-reference
      types: ['public.folder', 'public.item'],
      meta: {
        path: expandedPath,
      },
    }
  },

  // TODO
  // imperative invalidateKey method on cache
  //   for something like filesystem changes
  //
  // declarative TTL returned with item
  //   for something like github plugin

  async run({ path }) {
    // TODO
    // watch(path).on('change', () => {
    //   context.clearKey(itemId)
    // })

    const expandedPath = expandTilde(path)
    const folderContents = await readdir(expandedPath)

    const utisByExtension = await fileUtisByExtension(
      folderContents
        .filter((fileName) => !denyList.includes(fileName))
        .map((fileName) => join(expandedPath, fileName)),
    )

    const folderItems = folderContents
      .filter((fileName) => !denyList.includes(fileName))
      .map(async (fileName) => {
        const filePath = join(expandedPath, fileName)
        const fileExtension = extname(filePath).slice(1).toLowerCase()
        const type = mime.lookup(filePath)
        let charset = mime.charset(type)
        charset = typeof charset === 'string' ? charset.toLowerCase() : null

        let types = utisByExtension[fileExtension || fileName]

        return {
          name: fileName,
          detail: filePath.replace(os.homedir(), '~'),
          types: [...types, charset, fileExtension].filter(Boolean),
          meta: {
            path: filePath,
          },
        }
      })

    return Promise.all(folderItems)
  },
}

const openAction = {
  types: ['action'],
  directTypes: ['public.item'],
  name: 'Open',
  run: (direct) => {
    childProcess.execFile('open', [direct.meta.path])
  },
}

const revealAction = {
  types: ['action'],
  directTypes: ['public.item'],
  name: 'Reveal',
  run: (direct) => {
    childProcess.execFile('open', ['-R', direct.meta.path])
  },
}

const openWithAction = {
  types: ['action'],
  directTypes: ['public.item'],
  indirectTypes: ['com.apple.application'],
  name: 'Open With',
  run: (direct, indirect) => {
    childProcess.execFile('open', ['-a', indirect.meta.path, direct.meta.path])
  },
}

export const providers = [folderItemsProvider]
export const actions = [openAction, revealAction, openWithAction]
