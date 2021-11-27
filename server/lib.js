import { readFile } from 'fs/promises'

import sift from 'sift'

import { itemToId } from './utils.js'
import path from 'path'

const debug = false
const log = debug ? console.log : () => {}

export const itemCatalogItem = {
  id: 'item-catalog',
  types: ['item-catalog'],
}

export const actionCatalogItem = {
  id: 'action-catalog',
  types: ['action-catalog'],
}

export const initialize = (context) => {
  context.cache.core = [itemCatalogItem, actionCatalogItem]
}

export const getChildrenForItem = async (parentItem, context) => {
  const matchingProviders = context.providers.filter(
    sift({ inputTypes: { $in: parentItem.types } }),
  )

  let children = []
  for (const provider of matchingProviders) {
    const items = await runProvider(provider, parentItem.meta, context)
    children = children.concat(items)
  }

  for (const item of children) {
    item.id = item.id || itemToId(item)
    item.parentId = parentItem.id
    item.hasChildren = context.providers.some(
      sift({ inputTypes: { $in: item.types } }),
    )
  }

  return children
}

export const getActionsForItem = async (item, context) => {
  const matchingProviders = context.providers.filter(
    sift({
      inputTypes: { $in: actionCatalogItem.types },
    }),
  )

  let actions = []
  for (const provider of matchingProviders) {
    const items = await runProvider(provider, actionCatalogItem.meta, context)
    actions = actions.concat(items)
  }

  for (const item of actions) {
    item.id = item.id || itemToId(item)
    item.parentId = actionCatalogItem.id
    item.hasChildren = context.providers.some(
      sift({ inputTypes: { $in: item.types } }),
    )
  }

  actions = actions.filter(
    sift({
      types: { $in: ['action'] },
      directTypes: { $in: item.types },
    }),
  )

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

export const runProvider = async (provider, meta, context) => {
  const cacheKey = JSON.stringify([provider.id, meta])

  if (context.cache[cacheKey]) {
    log('[cache] cache hit', cacheKey)
    return context.cache[cacheKey]
  }

  log('[cache] cache miss', cacheKey)
  const items = await provider.run(meta)
  context.cache[cacheKey] = items
  return items
}

export const getItemById = (id, context) => {
  const allItems = Object.values(context.cache).flat()
  return allItems.find((item) => item.id === id)
}

export const getActionById = getItemById

const itemIconCache = {}
export const getIconForItem = async (item, context) => {
  const cacheKey = item.id

  if (itemIconCache[cacheKey]) {
    log('[cache] cache hit', cacheKey)
    return itemIconCache[cacheKey]
  }

  const provider = context.providers.find(
    sift({ outputTypes: { $in: item.types } }),
  )

  if (!provider) {
    const iconBuffer = await readFile(
      path.join(import.meta.url.replace('file:', ''), '../images/missing.png'),
    )
    return iconBuffer
  }

  try {
    if (provider.getIcon) {
      const iconBuffer = await provider.getIcon(item.meta)
      log('[cache] cache miss', cacheKey)
      itemIconCache[cacheKey] = iconBuffer

      return iconBuffer
    }

    const iconBuffer = await readFile(
      path.join(import.meta.url.replace('file:', ''), '../images/missing.png'),
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
    log('[cache] cache hit', cacheKey)
    return actionIconCache[cacheKey]
  }

  try {
    if (action.getIcon) {
      const iconBuffer = action.getIcon()
      log('[cache] cache miss', cacheKey)
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
