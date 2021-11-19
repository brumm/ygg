import { readFile } from 'fs/promises'

import sift from 'sift'

import { makeId } from './utils.js'
import path from 'path'

const catalogItem = {
  id: makeId(),
  types: ['catalog'],
  meta: {},
}

const cache = (global.cache = {
  core: catalogItem,
})

export const getChildrenForItem = async (parentItem, context) => {
  if (parentItem === null) {
    parentItem = catalogItem
  }

  const matchingProviders = context.providers.filter(
    sift({ providesItemsForTypes: { $in: parentItem.types } }),
  )

  let children = []
  for (const provider of matchingProviders) {
    const items = await runProvider(provider, parentItem.meta)
    children = children.concat(items)
  }

  for (const item of children) {
    item.id = item.id || makeId()
    item.parentId = parentItem.id
    item.hasChildren = context.providers.some(
      sift({ providesItemsForTypes: { $in: item.types } }),
    )
  }

  return children
}

export const getActionsForItem = async (item, context) => {
  const actions = context.actions.filter(
    sift({
      types: { $in: ['action'] },
      directTypes: { $in: item.types },
    }),
  )

  for (const action of actions) {
    action.id = action.id || makeId()
  }

  return actions
}

export const getIndirectsForAction = async (
  parentItem,
  actionItem,
  context,
) => {
  const items = await getChildrenForItem(parentItem, context)
  return items.filter(sift({ types: { $in: actionItem.indirectTypes } }))
}

export const runProvider = async (provider, meta) => {
  const cacheKey = JSON.stringify([provider.id, meta])

  if (cache[cacheKey]) {
    // console.log('[cache] cache hit', cacheKey)
    return cache[cacheKey]
  }

  // console.log('[cache] cache miss', cacheKey)
  const items = await provider.run(meta)
  cache[cacheKey] = items
  return items
}

export const getItemById = (id) => {
  const allItems = Object.values(cache).flat()
  return allItems.find((item) => item.id === id)
}

const itemIconCache = {}
export const getIconForItem = async (item, context) => {
  const cacheKey = item.id

  if (itemIconCache[cacheKey]) {
    // console.log('[cache] cache hit', cacheKey)
    return itemIconCache[cacheKey]
  }

  const provider = context.providers.find(
    sift({ providesTypesOfItems: { $in: item.types } }),
  )

  if (!provider) {
    const iconBuffer = await readFile(
      path.join(import.meta.url.replace('file:', ''), '../images/item.png'),
    )
    return iconBuffer
  }

  try {
    if (provider.getIcon) {
      const iconBuffer = await provider.getIcon(item.meta)
      // console.log('[cache] cache miss', cacheKey)
      itemIconCache[cacheKey] = iconBuffer

      return iconBuffer
    }

    const iconBuffer = await readFile(
      path.join(import.meta.url.replace('file:', ''), '../images/item.png'),
    )
    return iconBuffer
  } catch (error) {
    console.error({ error, provider, item, context })
    return error
  }
}

const actionIconCache = {}
export const getIconForAction = async (action, context) => {
  const cacheKey = action.id

  if (actionIconCache[cacheKey]) {
    // console.log('[cache] cache hit', cacheKey)
    return actionIconCache[cacheKey]
  }

  try {
    if (action.getIcon) {
      const iconBuffer = action.getIcon()
      // console.log('[cache] cache miss', cacheKey)
      actionIconCache[cacheKey] = iconBuffer
      return iconBuffer
    }

    // TODO do less work
    const iconBuffer = await readFile(
      path.join(import.meta.url.replace('file:', ''), '../images/action.png'),
    )
    return iconBuffer
  } catch (error) {
    console.error({ error, action, context })
    return error
  }
}
