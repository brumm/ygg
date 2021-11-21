import test from 'ava'

import {
  getChildrenForItem,
  getActionsForItem,
  getIndirectsForAction,
  itemCatalogItem,
  actionCatalogItem,
} from './lib.js'

import { makeId } from './utils.js'

console.clear()

test('it works with a specific parent item', async (t) => {
  const parentItem = {
    id: makeId(),
    types: ['public.folder'],
    meta: { path: '/foo' },
  }

  const [item] = await getChildrenForItem(parentItem, {
    cache: {},
    providers: [
      {
        id: makeId(),
        providesItemsForTypes: ['public.folder'],
        async run({ path }) {
          return [
            {
              id: makeId(),
              types: ['public.folder'],
              meta: { path: `${path}/bar` },
            },
          ]
        },
      },
    ],
  })

  t.not(item, undefined)
  t.is(item.meta.path, '/foo/bar')
})

test('can provide children if item has matching provider', async (t) => {
  const [item] = await getChildrenForItem(itemCatalogItem, {
    cache: {},
    providers: [
      {
        id: makeId(),
        providesItemsForTypes: itemCatalogItem.types,
        async run() {
          return [{ id: makeId(), types: ['public.folder'] }]
        },
      },
      {
        id: makeId(),
        providesItemsForTypes: ['public.folder'],
        async run() {
          return [{ id: makeId(), types: ['public.folder'] }]
        },
      },
    ],
  })

  t.true(item.hasChildren)
})

test('no children if item theres no matching provider', async (t) => {
  const [item] = await getChildrenForItem(itemCatalogItem, {
    cache: {},
    providers: [
      {
        id: makeId(),
        providesItemsForTypes: itemCatalogItem.types,
        async run() {
          return [{ id: makeId(), types: ['public.folder'] }]
        },
      },
    ],
  })

  t.false(item.hasChildren)
})

test('it works without parentItem when having a catalog provider', async (t) => {
  const [item] = await getChildrenForItem(itemCatalogItem, {
    cache: {},
    providers: [
      {
        id: makeId(),
        providesItemsForTypes: itemCatalogItem.types,
        async run() {
          return [{ id: makeId(), types: ['public.folder'] }]
        },
      },
    ],
  })

  t.not(item, undefined)
})

test('it returns empty array when not having a catalog parentItem or provider', async (t) => {
  const [item] = await getChildrenForItem(itemCatalogItem, {
    cache: {},
    providers: [],
  })

  t.is(item, undefined)
})

test('match action to item', async (t) => {
  const item = { id: makeId(), types: ['public.folder'] }
  const foo = [
    { id: makeId(), types: ['action'], directTypes: ['public.folder'] },
    { id: makeId(), types: ['action'], directTypes: ['something.else'] },
    { id: makeId(), types: ['action'], directTypes: ['public.folder'] },
  ]

  const actions = await getActionsForItem(item, {
    cache: {},
    providers: [
      {
        id: makeId(),
        providesItemsForTypes: actionCatalogItem.types,
        async run() {
          return foo
        },
      },
    ],
    actions: foo,
  })

  const [action] = actions

  t.not(action, undefined)
  t.is(actions.length, 2)
  t.is(action.types[0], 'action')
  t.is(actions[0].directTypes[0], 'public.folder')
  t.is(actions[1].directTypes[0], 'public.folder')
})

test('get indirect item matching parent and action', async (t) => {
  const parentItem = {
    id: makeId(),
    types: ['public.folder'],
    meta: { path: '/foo' },
  }
  const action = {
    id: makeId(),
    types: ['action'],
    directTypes: ['public.folder'],
    indirectTypes: ['com.apple.application'],
  }

  const [item] = await getIndirectsForAction(parentItem, action, {
    cache: {},
    providers: [
      {
        id: makeId(),
        providesItemsForTypes: ['public.folder'],
        async run({ path }) {
          return [
            {
              id: makeId(),
              types: ['public.folder'],
              meta: { path: `${path}/bar` },
            },
            {
              id: makeId(),
              types: ['com.apple.application'],
              meta: { path: `${path}/baz` },
            },
          ]
        },
      },
    ],
  })

  t.not(item, undefined)
  t.is(item.types[0], 'com.apple.application')
  t.is(item.meta.path, '/foo/baz')
})

test('get indirect item matching catalog and action', async (t) => {
  const action = {
    id: makeId(),
    types: ['action'],
    directTypes: ['public.folder'],
    indirectTypes: ['com.apple.application'],
  }

  const [item] = await getIndirectsForAction(itemCatalogItem, action, {
    cache: {},
    providers: [
      {
        id: makeId(),
        providesItemsForTypes: itemCatalogItem.types,
        async run() {
          return [
            { id: makeId(), types: ['public.folder'] },
            { id: makeId(), types: ['com.apple.application'] },
          ]
        },
      },
    ],
  })

  t.not(item, undefined)
  t.is(item.types[0], 'com.apple.application')
})

test('can us', async (t) => {
  const [item] = await getChildrenForItem(actionCatalogItem, {
    cache: {},
    providers: [
      {
        id: makeId(),
        providesItemsForTypes: actionCatalogItem.types,
        async run() {
          return [
            {
              id: makeId(),
              types: ['action'],
            },
          ]
        },
      },
    ],
  })

  t.not(item, undefined)
})
