import React, { Fragment } from 'react'
import ReactDOM from 'react-dom'
import {
  MemoryRouter,
  Redirect,
  Route,
  Switch,
  useRouteMatch,
} from 'react-router'
import { Link, NavLink } from 'react-router-dom'
import intersect from 'intersect'

import './index.css'
import clsx from 'clsx'

const makeId = () => Math.random().toString(32).slice(2)
const intersects = (...args) => intersect(...args).length > 0

const Location = () => {
  const {
    params: {
      directId,
      directChildId,
      actionId,
      actionChildId,
      indirectId,
      indirectChildId,
    },
  } = useRouteMatch(
    '/:directId?/:directChildId?/:actionId?/:actionChildId?/:indirectId?/:indirectChildId?',
  )

  const directSource = catalog.find(byItemId(directId))
  const directItem = catalog.find(byItemId(directChildId))

  const actionSource = catalog.find(byItemId(actionId))
  const actionItem = catalog.find(byItemId(actionChildId))

  const indirectSource = catalog.find(byItemId(indirectId))
  const indirectItem = catalog.find(byItemId(indirectChildId))

  return (
    <pre className="p-2 m-2 text-xs border">
      <code>
        {JSON.stringify(
          {
            directSource,
            directItem,
            actionSource,
            actionItem,
            indirectSource,
            indirectItem,
          },
          null,
          2,
        )}
      </code>
    </pre>
  )
}

const Slot = ({ active, children, onClick }) => {
  return (
    <div
      className={clsx('flex items-center justify-center border', {
        'border-red-500': active,
      })}
      style={{ aspectRatio: '1/1' }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

const catalog = [
  { id: makeId(), types: ['item', 'file'], name: 'foo.txt' },
  { id: makeId(), types: ['item', 'folder'], name: 'bar' },
  { id: makeId(), types: ['item', 'contact'], name: 'Elizabeth Brumm' },
  { id: makeId(), types: ['item', 'application'], name: 'Foo.app' },
  {
    id: makeId(),
    types: ['item', 'action'],
    name: 'Open',
    directTypes: ['file', 'folder'],
  },
  {
    id: makeId(),
    types: ['item', 'action'],
    name: 'Open with...',
    directTypes: ['file', 'folder'],
    indirectTypes: ['application'],
  },
  {
    id: makeId(),
    types: ['item', 'action'],
    name: 'Reveal',
    directTypes: ['file', 'folder'],
  },
  {
    id: makeId(),
    types: ['item', 'action'],
    name: 'Show Contact',
    directTypes: ['contact'],
  },
  {
    id: makeId(),
    types: ['item', 'action'],
    name: 'Edit Contact',
    directTypes: ['contact'],
  },
  {
    id: makeId(),
    types: ['item', 'action'],
    name: 'Assign Abbreviation',
    directTypes: ['item'],
  },
]

const catalogItem = {
  id: makeId(),
  children: () =>
    catalog.filter((item) => intersects(item.types, ['action']) === false),
}

const actionsItem = {
  id: makeId(),
  children: () =>
    catalog.filter((item) => intersects(item.types, ['action']) === true),
}

console.log(catalog)

const byItemId = (itemId) => (item) => item.id === itemId

const Foo = () => {
  return (
    <Switch>
      <Route path="/:directId" exact>
        {({
          match: {
            params: { directId },
          },
        }) => {
          let directChildId
          if (directId === catalogItem.id) {
            directChildId = catalogItem.children()[0].id
          } else {
            directChildId = catalog[directId].children()[0].id
          }

          return <Redirect to={`/${directId}/${directChildId}`} />
        }}
      </Route>

      <Route path="/:directId/:directChildId" exact>
        {({
          match: {
            params: { directId, directChildId },
          },
        }) => {
          const actionId = actionsItem.id
          const directItem = catalog.find(byItemId(directChildId))

          const actionChildId = actionsItem
            .children()
            .find((action) =>
              intersects(action.directTypes, directItem.types),
            )?.id

          if (!actionChildId) {
            return null
          }

          return (
            <Redirect
              to={`/${directId}/${directChildId}/${actionId}/${actionChildId}`}
            />
          )
        }}
      </Route>
    </Switch>
  )
}

const App = () => {
  const [slotIndex, setSlotIndex] = React.useState(0)

  return (
    <div className="">
      <div className="grid grid-cols-3 gap-2 p-2">
        <Switch>
          <Route path="/" exact>
            <Slot>
              <Link to={`/${catalogItem.id}`}>Type to search</Link>
            </Slot>
            <Slot />
          </Route>
          <Route path="/:directId/:directChildId?/:actionId?/:actionChildId?/:indirectId?/:indirectChildId?">
            {({ match }) => {
              if (match === null) {
                return null
              }
              const {
                params: {
                  directId,
                  directChildId,
                  actionId,
                  actionChildId,
                  indirectId,
                  indirectChildId,
                },
              } = match
              const directItem = catalog.find(byItemId(directChildId))
              const actionItem = catalog.find(byItemId(actionChildId))
              const indirectItem = catalog.find(byItemId(indirectChildId))
              return (
                <Fragment>
                  <Slot
                    active={slotIndex === 0}
                    onClick={() => setSlotIndex(0)}
                  >
                    {directItem?.name}
                  </Slot>

                  <Slot
                    active={slotIndex === 1}
                    onClick={() => setSlotIndex(1)}
                  >
                    {actionItem?.name}
                  </Slot>

                  <Slot
                    active={slotIndex === 2}
                    onClick={() => setSlotIndex(2)}
                  >
                    {indirectItem?.name}
                  </Slot>
                </Fragment>
              )
            }}
          </Route>
        </Switch>
      </div>

      {slotIndex === 0 && (
        <Route
          path="/:directId"
          render={({
            match: {
              params: { directId },
            },
          }) => {
            let items
            if (directId === catalogItem.id) {
              items = catalogItem.children()
            } else {
              items = catalog[directId].children()
            }

            return (
              <div className="divide-y">
                {items.map((item) => (
                  <NavLink
                    className="block p-2"
                    to={`/${directId}/${item.id}`}
                    activeClassName="text-red-500"
                  >
                    {item.name}
                  </NavLink>
                ))}
              </div>
            )
          }}
        />
      )}

      {slotIndex === 1 && (
        <Route
          path="/:directId/:directChildId/:actionId"
          render={({
            match: {
              params: { directId, directChildId, actionId },
            },
          }) => {
            let items
            if (actionId === actionsItem.id) {
              items = actionsItem.children()
            } else {
              items = catalog[actionId].children()
            }

            const directItem = catalog.find(byItemId(directChildId))

            items = items.filter((action) =>
              intersects(action.directTypes, directItem.types),
            )

            return (
              <div className="divide-y">
                {items.map((item) => (
                  <NavLink
                    className="block p-2"
                    to={`/${directId}/${directChildId}/${item.id}`}
                    activeClassName="text-red-500"
                  >
                    {item.name}
                  </NavLink>
                ))}
              </div>
            )
          }}
        />
      )}
    </div>
  )
}

ReactDOM.render(
  <MemoryRouter initialEntries={['/']}>
    <Location />
    <Foo />
    <App />
  </MemoryRouter>,
  document.getElementById('root'),
)
