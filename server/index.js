console.clear()

import createFastify from 'fastify'
import cors from 'fastify-cors'
import sift from 'sift'
import { fileIconToBuffer } from 'file-icon'

import {
  getActionsForItem,
  getItemById,
  getChildrenForItem,
  getIndirectsForAction,
  getIconForItem,
  getIconForAction,
} from './lib.js'

import * as fileSystemPlugin from './plugins/file-system.js'
import * as corePlugin from './plugins/core.js'
import * as plainTextPlugin from './plugins/plain-text.js'

const fastify = createFastify({
  disableRequestLogging: true,
})

fastify.register(cors)

const plugins = [fileSystemPlugin, corePlugin, plainTextPlugin]

const context = (global.context = {})
const providers = []
const actions = []

for (const plugin of plugins) {
  if (plugin.providers) {
    for (const provider of plugin.providers) {
      if (typeof provider === 'function') {
        providers.push(provider(context))
      } else {
        providers.push(provider)
      }
    }
  }

  if (plugin.actions) {
    for (const action of plugin.actions) {
      if (typeof action === 'function') {
        actions.push(action(context))
      } else {
        actions.push(action)
      }
    }
  }
}

context.providers = providers
context.actions = actions

// todo move to lib
const getActionById = (id) => {
  return actions.find(sift({ id }))
}

// --- item

fastify.get('/items/:itemId', async (request, reply) => {
  return getItemById(request.params.itemId)
})

// --- direct

fastify.get('/items/default/children', async (request, reply) => {
  return getChildrenForItem(null, context)
})

fastify.get('/items/:itemId/children', async (request, reply) => {
  const item = getItemById(request.params.itemId)
  return getChildrenForItem(item, context)
})

// --- action

fastify.get('/items/:itemId/actions', async (request, reply) => {
  const item = getItemById(request.params.itemId)
  return getActionsForItem(item, context)
})

// --- indirect

fastify.get(
  '/items/default/actions/:actionId/indirects',
  async (request, reply) => {
    const action = getActionById(request.params.actionId)

    if (!action.indirectTypes) {
      return []
    }

    return getIndirectsForAction(null, action, context)
  },
)

fastify.get(
  '/items/:itemId/actions/:actionId/indirects',
  async (request, reply) => {
    const item = getItemById(request.params.itemId)
    const action = getActionById(request.params.actionId)

    if (!action.indirectTypes) {
      return []
    }

    return getIndirectsForAction(item || null, action, context)
  },
)

// --- execute

fastify.post('/execute-command', async (request, reply) => {
  const { directId, actionId, indirectId } = JSON.parse(request.body)
  const direct = getItemById(directId)
  const action = getActionById(actionId)
  const indirect = getItemById(indirectId)

  action.run(direct, indirect)

  return null
})

// --- icons

fastify.get('/items/:itemId/icon', async (request, reply) => {
  const item = getItemById(request.params.itemId)
  return getIconForItem(item, context)
})

fastify.get('/actions/:actionId/icon', async (request, reply) => {
  const action = getActionById(request.params.actionId)
  return getIconForAction(action, context)
})

// ---

process.on('uncaughtException', (error) => {
  console.error(error)
  process.exit(1)
})

try {
  await fastify.listen(8080)
} catch (error) {
  fastify.log.error(error)
  console.error(error)
  process.exit(1)
}
