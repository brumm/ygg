import { readFile } from 'fs/promises'

import sift from 'sift'

import { itemToId } from './utils.js'
import path from 'path'

const debug = false
const log = debug ? console.log : () => {}

const itemCatalogItem = {
  id: 'item-catalog',
  types: ['item-catalog'],
}

const actionCatalogItem = {
  id: 'action-catalog',
  types: ['action-catalog'],
}

class Ygg {
  cache = {}
  providers = []
  actions = []
  iconCache = {}

  constructor({ plugins }) {
    const context = {
      cache: this.cache,
      providers: this.providers,
      actions: this.actions,
    }

    for (const plugin of plugins) {
      if (plugin.providers) {
        for (const provider of plugin.providers) {
          if (typeof provider === 'function') {
            this.providers.push(provider(context))
          } else {
            this.providers.push(provider)
          }
        }
      }

      if (plugin.actions) {
        for (const action of plugin.actions) {
          if (typeof action === 'function') {
            this.actions.push(action(context))
          } else {
            this.actions.push(action)
          }
        }
      }
    }
  }

  async initialize() {
    this.cache.core = [itemCatalogItem, actionCatalogItem]

    try {
      console.time('prime cache')
      for (const item of this.cache.core) {
        await this.getChildrenForItem(item.id)
      }
    } catch (error) {
      console.error('error initializing ygg', error)
    } finally {
      console.timeEnd('prime cache')
    }
  }

  async getChildrenForItem(parentItemId) {
    const parentItem = this.getItemById(parentItemId)

    const matchingProviders = this.providers.filter(
      sift({ inputTypes: { $in: parentItem.types } }),
    )

    let children = []
    for (const provider of matchingProviders) {
      const items = await this.runProvider(provider, parentItem.meta, this)
      children = children.concat(items)
    }

    for (const item of children) {
      item.id = item.id || itemToId(item)
      item.parentId = parentItem.id
      item.hasChildren = this.providers.some(
        sift({ inputTypes: { $in: item.types } }),
      )
    }

    return children
  }

  async getActionsForItem(itemId) {
    const item = this.getItemById(itemId)

    const matchingProviders = this.providers.filter(
      sift({
        inputTypes: { $in: actionCatalogItem.types },
      }),
    )

    let actions = []
    for (const provider of matchingProviders) {
      const items = await this.runProvider(provider, actionCatalogItem.meta)
      actions = actions.concat(items)
    }

    for (const item of actions) {
      item.id = item.id || itemToId(item)
      item.parentId = actionCatalogItem.id
      item.hasChildren = this.providers.some(
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

  async getIndirectsForAction(itemId, actionItemId) {
    const item = this.getItemById(itemId)
    const actionItem = this.getItemById(actionItemId)

    if (!actionItem.indirectTypes) {
      return null
    }

    const items = await this.getChildrenForItem(item)
    return items.filter(sift({ types: { $in: actionItem.indirectTypes } }))
  }

  async runProvider(provider, meta) {
    const cacheKey = JSON.stringify([provider.id, meta])

    if (this.cache[cacheKey]) {
      log('[cache] cache hit', cacheKey)
      return this.cache[cacheKey]
    }

    log('[cache] cache miss', cacheKey)
    const items = await provider.run(meta)
    this.cache[cacheKey] = items
    return items
  }

  async runAction(directItemId, actionItemId, indirectItemId) {
    const directItem = this.getItemById(directItemId)
    const actionItem = this.getItemById(actionItemId)
    const indirectItem = this.getItemById(indirectItemId)
    return actionItem.run(directItem, indirectItem)
  }

  getItemById(id) {
    const allItems = Object.values(this.cache).flat()
    return allItems.find((item) => item.id === id)
  }

  async getIconForItem(itemId) {
    const item = this.getItemById(itemId)
    const cacheKey = item.id

    if (this.iconCache[cacheKey]) {
      log('[cache] cache hit', cacheKey)
      return this.iconCache[cacheKey]
    }

    const provider = this.providers.find(
      sift({ outputTypes: { $in: item.types } }),
    )

    if (!provider) {
      const iconBuffer = await readFile(
        path.join(
          import.meta.url.replace('file:', ''),
          '../images/missing.png',
        ),
      )
      return iconBuffer
    }

    try {
      if (provider.getIcon) {
        const iconBuffer = await provider.getIcon(item.meta)
        log('[cache] cache miss', cacheKey)
        this.iconCache[cacheKey] = iconBuffer

        return iconBuffer
      }

      const iconBuffer = await readFile(
        path.join(
          import.meta.url.replace('file:', ''),
          '../images/missing.png',
        ),
      )
      return iconBuffer
    } catch (error) {
      console.error({ error, provider, item, self: this })
      return error
    }
  }
}

export default Ygg
