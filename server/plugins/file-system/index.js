import { readdir } from 'fs/promises'
import { basename, extname } from 'path'
import os from 'os'
import childProcess from 'child_process'
import { fileIconToBuffer } from 'file-icon'
import expandTilde from 'expand-tilde'

import getFileMetadata from './getFileMetadata.js'

// TODO
// import { watch } from 'fs'

const folderItemsProvider = {
  id: 'folderProvider',
  providesItemsForTypes: ['public.folder', 'com.apple.application'],
  providesTypesOfItems: ['public.folder', 'public.item'],

  async getIcon({ path }) {
    return fileIconToBuffer(path, { size: 128 })
  },

  async getProviderItemName({ path }) {
    return {
      name: basename(path),
      detail: path.replace(os.homedir(), '~'),
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

    path = expandTilde(path)

    const folderContents = await readdir(path)
    const folderItems = await Promise.all(
      folderContents.map(async (fileName) => {
        const filePath = `${path}/${fileName}`
        const fileExtension = extname(filePath).slice(1)
        let types = []

        try {
          types = await getFileMetadata(filePath)
        } catch (error) {
          // console.error('failed to get metadata for', { error, path, filePath, fileExtension, })
        }

        return {
          name: fileName,
          detail: filePath.replace(os.homedir(), '~'),
          types: [...types, fileExtension.toLowerCase()],
          meta: {
            path: filePath,
          },
        }
      }),
    )

    return folderItems
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

const printAction = {
  types: ['action'],
  directTypes: ['public.image'],
  name: 'Print',
  run: (...args) => console.log('Print', ...args),
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
export const actions = [openAction, revealAction, printAction, openWithAction]
