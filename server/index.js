console.clear()

import createFastify from 'fastify'
import cors from 'fastify-cors'
import fastifyHttpErrorsEnhanced from 'fastify-http-errors-enhanced'

import Ygg from './core.js'

import * as fileSystemPlugin from './plugins/file-system'
import * as corePlugin from './plugins/core.js'
import * as plainTextPlugin from './plugins/plain-text.js'

console.clear()

const fastify = createFastify({
  disableRequestLogging: true,
})

fastify.register(cors)
fastify.register(fastifyHttpErrorsEnhanced, { hideUnhandledErrors: false })

const plugins = [fileSystemPlugin, corePlugin, plainTextPlugin]

const ygg = new Ygg({ plugins })
global.ygg = ygg

// --- item

fastify.get('/items/:itemId', async (request, reply) => {
  return ygg.getItemById(request.params.itemId)
})

// --- direct

fastify.get('/items/:itemId/children', async (request, reply) => {
  return ygg.getChildrenForItem(request.params.itemId)
})

// --- action

fastify.get('/items/:itemId/actions', async (request, reply) => {
  return ygg.getActionsForItem(request.params.itemId)
})

// --- indirect

fastify.get(
  '/items/default/actions/:actionId/indirects',
  async (request, reply) => {
    if (!action.indirectTypes) {
      return []
    }

    return ygg.getIndirectsForAction(null, request.params.actionId)
  },
)

fastify.get(
  '/items/:itemId/actions/:actionId/indirects',
  async (request, reply) => {
    return ygg.getIndirectsForAction(
      request.params.itemId,
      request.params.actionId,
    )
  },
)

// --- execute

fastify.post('/execute-command', async (request, reply) => {
  const { directId, actionId, indirectId } = JSON.parse(request.body)
  return ygg.runAction(directId, actionId, indirectId)
})

// --- icons

fastify.get('/items/:itemId/icon', async (request, reply) => {
  return ygg.getIconForItem(request.params.itemId)
})

fastify.get('/actions/:actionId/icon', async (request, reply) => {
  return ygg.getIconForItem(request.params.actionId)
})

// ---

process.on('uncaughtException', (error) => {
  console.error(error)
  process.exit(1)
})

try {
  await fastify.listen(8080)
  // await ygg.initialize()
} catch (error) {
  fastify.log.error(error)
  console.error(error)
  process.exit(1)
}
