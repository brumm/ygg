import sift from 'sift'

import { isNotHidden, isApplication } from '../filters.js'

const presets = [
  {
    itemProviderId: 'folderProvider',
    meta: { path: '/Users/philippbrumm/Code' },
    filter: isNotHidden,
  },
  {
    itemProviderId: 'folderProvider',
    meta: { path: '/Users/philippbrumm' },
    filter: isNotHidden,
  },
  {
    itemProviderId: 'folderProvider',
    meta: { path: '/Users/philippbrumm/Downloads' },
    filter: isNotHidden,
  },
  {
    itemProviderId: 'folderProvider',
    meta: { path: '/Users/philippbrumm/Desktop' },
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
  // {
  //   itemProviderId: 'githubProvider',
  //   meta: { repo: 'brumm/ygg' },
  // },
]

const catalogProvider = (context) => ({
  id: 'catalog',
  providesItemsForTypes: ['catalog'],
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
        items = items.filter(sift(preset.filter))

        return items
      }),
    )

    return catalogItems.flat()
  },
})

export const providers = [catalogProvider]
