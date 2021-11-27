import test from 'ava'

import {
  getChildrenForItem,
  getActionsForItem,
  getIndirectsForAction,
  itemCatalogItem,
  actionCatalogItem,
} from './lib.js'

export const makeRandomId = () => Math.random().toString(32).slice(2)

console.clear()

test('it works with a specific parent item', async (t) => {
  const parentItem = {
    id: makeRandomId(),
    types: ['public.folder'],
    meta: { path: '/foo' },
  }

  const [item] = await getChildrenForItem(parentItem, {
    cache: {},
    providers: [
      {
        id: makeRandomId(),
        inputTypes: ['public.folder'],
        async run({ path }) {
          return [
            {
              id: makeRandomId(),
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
        id: makeRandomId(),
        inputTypes: itemCatalogItem.types,
        async run() {
          return [{ id: makeRandomId(), types: ['public.folder'] }]
        },
      },
      {
        id: makeRandomId(),
        inputTypes: ['public.folder'],
        async run() {
          return [{ id: makeRandomId(), types: ['public.folder'] }]
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
        id: makeRandomId(),
        inputTypes: itemCatalogItem.types,
        async run() {
          return [{ id: makeRandomId(), types: ['public.folder'] }]
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
        id: makeRandomId(),
        inputTypes: itemCatalogItem.types,
        async run() {
          return [{ id: makeRandomId(), types: ['public.folder'] }]
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
  const item = { id: makeRandomId(), types: ['public.folder'] }
  const foo = [
    { id: makeRandomId(), types: ['action'], directTypes: ['public.folder'] },
    { id: makeRandomId(), types: ['action'], directTypes: ['something.else'] },
    { id: makeRandomId(), types: ['action'], directTypes: ['public.folder'] },
  ]

  const actions = await getActionsForItem(item, {
    cache: {},
    providers: [
      {
        id: makeRandomId(),
        inputTypes: actionCatalogItem.types,
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
    id: makeRandomId(),
    types: ['public.folder'],
    meta: { path: '/foo' },
  }
  const action = {
    id: makeRandomId(),
    types: ['action'],
    directTypes: ['public.folder'],
    indirectTypes: ['com.apple.application'],
  }

  const [item] = await getIndirectsForAction(parentItem, action, {
    cache: {},
    providers: [
      {
        id: makeRandomId(),
        inputTypes: ['public.folder'],
        async run({ path }) {
          return [
            {
              id: makeRandomId(),
              types: ['public.folder'],
              meta: { path: `${path}/bar` },
            },
            {
              id: makeRandomId(),
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
    id: makeRandomId(),
    types: ['action'],
    directTypes: ['public.folder'],
    indirectTypes: ['com.apple.application'],
  }

  const [item] = await getIndirectsForAction(itemCatalogItem, action, {
    cache: {},
    providers: [
      {
        id: makeRandomId(),
        inputTypes: itemCatalogItem.types,
        async run() {
          return [
            { id: makeRandomId(), types: ['public.folder'] },
            { id: makeRandomId(), types: ['com.apple.application'] },
          ]
        },
      },
    ],
  })

  t.not(item, undefined)
  t.is(item.types[0], 'com.apple.application')
})

test('can use action catalog items', async (t) => {
  const [item] = await getChildrenForItem(actionCatalogItem, {
    cache: {
      core: [itemCatalogItem, actionCatalogItem],
    },
    providers: [
      {
        id: makeRandomId(),
        inputTypes: actionCatalogItem.types,
        async run() {
          return [
            {
              id: makeRandomId(),
              types: ['action'],
            },
          ]
        },
      },
    ],
  })

  t.not(item, undefined)
})
