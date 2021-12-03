import { readFile } from 'fs/promises'
import { join } from 'path'
import sift from 'sift'

import { isNotHidden, isApplication } from '../filters.js'

const actionIconBuffer = await readFile(
  join(import.meta.url.replace('file:', ''), '../../images/action.png'),
)

const presets = [
  {
    itemProviderId: 'folderProvider',
    meta: { path: '~/Code' },
    filter: isNotHidden,
  },
  {
    itemProviderId: 'folderProvider',
    meta: { path: '~' },
    filter: isNotHidden,
    includeProviderItem: true,
  },
  {
    itemProviderId: 'folderProvider',
    meta: { path: '~/Downloads' },
    filter: isNotHidden,
  },
  {
    itemProviderId: 'folderProvider',
    meta: { path: '~/Desktop' },
    filter: isNotHidden,
  },
  {
    itemProviderId: 'folderProvider',
    meta: { path: '/Applications' },
    filter: { ...isNotHidden, ...isApplication },
  },
  {
    itemProviderId: 'folderProvider',
    meta: { path: '/System/Applications' },
    filter: { ...isNotHidden, ...isApplication },
  },
  {
    itemProviderId: 'folderProvider',
    meta: { path: '~/Applications' },
    filter: { ...isNotHidden, ...isApplication },
  },
]

const itemCatalogProvider = (context) => ({
  id: 'itemCatalogProvider',
  inputTypes: ['item-catalog'],
  async run() {
    const catalogItems = await Promise.all(
      presets.map(async (preset) => {
        const provider = context.providers.find(
          (provider) => provider.id === preset.itemProviderId,
        )

        if (!provider) {
          console.error(
            'no provider for itemProviderId:',
            preset.itemProviderId,
          )
          return []
        }

        let items = await provider.run(preset.meta)
        if (preset.filter) {
          items = items.filter(sift(preset.filter))
        }

        if (preset.includeProviderItem && provider.makeProviderItem) {
          const item = await provider.makeProviderItem(preset.meta)

          items.push({
            ...item,
            types: [...item.types, 'provider'],
            meta: {
              ...item.meta,
              providerId: provider.id,
            },
          })
        }

        return items
      }),
    )

    return catalogItems.flat()
  },
})

const actionCatalogProvider = (context) => ({
  id: 'actionCatalogProvider',
  inputTypes: ['action-catalog'],
  outputTypes: ['action'],
  async getIcon() {
    return actionIconBuffer
  },
  async run() {
    return context.actions
  },
})

export const providers = [itemCatalogProvider, actionCatalogProvider]
