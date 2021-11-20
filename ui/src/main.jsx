import React, { Fragment } from 'react'
import ReactDOM from 'react-dom'
import { QueryClient, QueryClientProvider, useQueries } from 'react-query'
import { ReactQueryDevtools } from 'react-query/devtools'
import { matchSorter } from 'match-sorter'

import './index.css'
import clsx from 'clsx'
import { wrapAround } from '../../server/utils'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    },
  },
})

const api = async (fragment, config) => {
  const response = await fetch(`http://localhost:8080${fragment}`, config)

  const json = await response.json()

  if (!response.ok) {
    const error = new Error(json.error)
    error.error = json.error
    error.itemId = json.itemId
    throw error
  }

  return json
}

const App = () => {
  const [parentIndex, setParentIndex] = React.useState(0)
  const [filterTexts, setFilterTexts] = React.useState(['', '', ''])
  const [parentIds, setParentIds] = React.useState([null, null, null])
  const [childIds, setChildIds] = React.useState([null, null, null])

  const [directParentId, actionParentId, indirectParentId] = parentIds
  const [directChildId, actionChildId, indirectChildId] = childIds

  const selectedChildId = childIds[parentIndex]

  const itemsQueries = useQueries([
    {
      queryKey: ['direct children', { directParentId }],
      queryFn: async () =>
        api(`/items/${directParentId ?? 'default'}/children`),
      keepPreviousData: true,
    },
    {
      queryKey: ['action children', { directChildId }],
      queryFn: async () => api(`/items/${directChildId}/actions`),
      enabled: directChildId !== null,
      keepPreviousData: true,
    },
    {
      queryKey: ['indirect children', { indirectParentId, actionChildId }],
      queryFn: async () => {
        if (indirectParentId !== null) {
          return api(`/items/${indirectParentId ?? 'default'}/children`)
        }

        return api(
          `/items/${
            indirectChildId ?? 'default'
          }/actions/${actionChildId}/indirects`,
        )
      },
      enabled: actionChildId !== null,
      keepPreviousData: true,
    },
  ])

  const filteredListItems = itemsQueries.map((query, index) =>
    matchSorter(query.data || [], filterTexts[index], {
      keys: ['name', 'details'],
    }),
  )

  // --- clear a lists filter text when its parent changes

  React.useLayoutEffect(() => {
    setFilterTexts(([direct, action, indirect]) => ['', action, indirect])
  }, [directParentId])

  // actions can't descend into other actions, so parent never changes

  React.useLayoutEffect(() => {
    setFilterTexts(([direct, action, indirect]) => [direct, action, ''])
  }, [indirectParentId])

  // --- clear a down-stream filterText when the selected child changes

  // direct has no up-stream child

  React.useLayoutEffect(() => {
    setFilterTexts(([direct, action, indirect]) => [direct, '', indirect])
  }, [directChildId])

  React.useLayoutEffect(() => {
    setFilterTexts(([direct, action, indirect]) => [direct, action, ''])
  }, [actionChildId])

  // --- each list auto selects its first item

  // collect first item ids of all filtered item lists
  const [
    firstDirectChildListItemId,
    firstActionChildListItemId,
    firstIndirectChildListItemId,
  ] = filteredListItems.map((items) => items?.[0]?.id)

  // select first item of direct list
  React.useLayoutEffect(() => {
    if (firstDirectChildListItemId) {
      setChildIds(([direct, action, indirect]) => [
        firstDirectChildListItemId,
        action,
        indirect,
      ])
    }
  }, [firstDirectChildListItemId])

  // select first item of action list
  React.useLayoutEffect(() => {
    if (firstActionChildListItemId) {
      setChildIds(([direct, action, indirect]) => [
        direct,
        firstActionChildListItemId,
        indirect,
      ])
    }
  }, [firstActionChildListItemId, firstDirectChildListItemId, directChildId])

  // select first item of indirect list
  React.useLayoutEffect(() => {
    if (firstIndirectChildListItemId) {
      setChildIds(([direct, action, indirect]) => [
        direct,
        action,
        firstIndirectChildListItemId,
      ])
    }
  }, [firstIndirectChildListItemId, firstDirectChildListItemId, actionChildId])

  const shouldShowIndirect =
    itemsQueries[1]?.data?.find((item) => item.id === actionChildId)
      ?.indirectTypes?.length > 0

  React.useLayoutEffect(() => {
    const handler = async (event) => {
      switch (event.key) {
        case 'Tab': {
          event.preventDefault()
          setParentIndex((index) => {
            const bounds = shouldShowIndirect ? 3 : 2
            const direction = event.shiftKey ? -1 : +1
            return wrapAround(index + direction, bounds)
          })
          break
        }

        case 'ArrowRight': {
          event.preventDefault()
          const item = filteredListItems[parentIndex].find(
            (item) => item.id === selectedChildId,
          )

          if (item.hasChildren === true) {
            setParentIds((ids) => {
              const selectedIds = [...ids]
              selectedIds[parentIndex] = selectedChildId
              return selectedIds
            })
          }
          break
        }

        case 'ArrowLeft': {
          event.preventDefault()
          const parentId = parentIds[parentIndex]
          if (parentId === null) {
            return
          }

          const parentItem = await api(`/items/${parentId || 'default'}`)

          setParentIds((ids) => {
            const selectedIds = [...ids]
            selectedIds[parentIndex] = parentItem.parentId || null
            return selectedIds
          })
          break
        }

        case 'ArrowUp':
        case 'ArrowDown': {
          event.preventDefault()
          const direction = event.key === 'ArrowUp' ? -1 : +1

          const currentIndex = filteredListItems[parentIndex].findIndex(
            (item) => item.id === selectedChildId,
          )
          const selectedFilteredListItems = filteredListItems[parentIndex]
          const nextIndex = wrapAround(
            currentIndex + direction,
            selectedFilteredListItems.length,
          )
          const nextItem = filteredListItems[parentIndex][nextIndex]

          setChildIds((ids) => {
            const selectedIds = [...ids]
            selectedIds[parentIndex] = nextItem?.id
            return selectedIds
          })
          break
        }

        case 'Enter': {
          event.preventDefault()
          await api('/execute-command', {
            method: 'post',
            body: JSON.stringify({
              directId: directChildId,
              actionId: actionChildId,
              indirectId: indirectChildId,
            }),
          })
          // TODO check for errors before hiding
          window.app?.hide()

          // setParentIndex(0)
          // setFilterTexts(['', '', ''])
          // setParentIds([null, null, null])
          // setChildIds([null, null, null])
          break
        }

        case 'Backspace': {
          event.preventDefault()
          setFilterTexts((texts) => {
            const filterTexts = [...texts]
            filterTexts[parentIndex] = ''
            return filterTexts
          })
          break
        }

        default: {
          if (event.metaKey || event.ctrlKey || event.altKey) {
            return
          }

          if (
            'abcdefghijklmnopqrstuvwxyz1234567890'.includes(
              event.key.toLowerCase(),
            )
          ) {
            event.preventDefault()
            setParentIds((ids) => {
              const selectedIds = [...ids]
              selectedIds[parentIndex] = 'default'
              return selectedIds
            })
            setFilterTexts((texts) => {
              const filterTexts = [...texts]
              filterTexts[parentIndex] += event.key.toLowerCase()
              return filterTexts
            })
          }
        }

        // no default
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [
    actionChildId,
    directChildId,
    filteredListItems,
    indirectChildId,
    itemsQueries,
    parentIds,
    parentIndex,
    selectedChildId,
    shouldShowIndirect,
  ])

  React.useLayoutEffect(() => {
    window.app?.resize({
      width: shouldShowIndirect ? 520 : 352,
    })
  }, [shouldShowIndirect])

  React.useLayoutEffect(() => {
    window.app?.resize({
      height:
        176 +
        Math.max(Math.min(5, filteredListItems[parentIndex]?.length), 1) * 64,
    })
  }, [filteredListItems, parentIndex])

  return (
    <Fragment>
      <div className="flex flex-col w-screen h-screen text-gray-400 bg-gray-800">
        <div
          className="relative inline-flex gap-4 p-4"
          style={{
            boxShadow: '0 1px rgba(0, 0, 0, 0.2)',
          }}
        >
          {childIds.map((itemId, itemIndex) => {
            const item = itemsQueries[itemIndex]?.data?.find(
              (item) => item.id === itemId,
            )

            if (itemIndex === 2 && shouldShowIndirect === false) {
              return null
            }

            const isSelected = itemIndex === parentIndex

            return (
              <div
                key={itemIndex}
                onClick={() => setParentIndex(itemIndex)}
                className={clsx(
                  'flex flex-col items-center justify-center rounded-md flex-shrink-0 w-[9.5rem] h-36',
                  {
                    'bg-gray-700': isSelected,
                  },
                )}
              >
                {itemIndex === 1 && item
                  ? item && (
                      <img
                        loading="lazy"
                        className="w-24 h-24 rounded"
                        src={`http://localhost:8080/actions/${item?.id}/icon`}
                        alt=""
                      />
                    )
                  : item && (
                      <img
                        loading="lazy"
                        className="w-24 h-24 rounded"
                        src={`http://localhost:8080/items/${item?.id}/icon`}
                        alt=""
                      />
                    )}

                <div className="flex items-center justify-center w-full px-4">
                  <span className="truncate">
                    {item?.name}
                    {item?.indirectTypes?.length && '...'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredListItems[parentIndex]?.map((item) => {
            const isSelected = item.id === selectedChildId
            return (
              <div
                ref={(element) =>
                  element && isSelected && element.scrollIntoViewIfNeeded()
                }
                key={item.id}
                onClick={() =>
                  setChildIds((ids) => {
                    const selectedIds = [...ids]
                    selectedIds[parentIndex] = item.id
                    return selectedIds
                  })
                }
                className={clsx(
                  'flex h-16 items-center justify-between px-4 overflow-hidden gap-4',
                  {
                    'bg-gray-700': isSelected,
                  },
                )}
              >
                {parentIndex === 1 && item
                  ? item && (
                      <img
                        loading="lazy"
                        className="w-10 h-10 rounded"
                        src={`http://localhost:8080/actions/${item?.id}/icon`}
                        alt=""
                      />
                    )
                  : item && (
                      <img
                        loading="lazy"
                        className="w-10 h-10 rounded"
                        src={`http://localhost:8080/items/${item?.id}/icon`}
                        alt=""
                      />
                    )}

                <div className="flex-auto truncate">
                  <div className="truncate">
                    {item.name}
                    {item.indirectTypes?.length && '...'}
                  </div>

                  <div className="truncate">
                    <span className="block text-sm text-gray-500 truncate">
                      {item.detail}
                    </span>
                  </div>
                </div>

                {item.hasChildren && (
                  <div className="flex-shrink-0 text-gray-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-6 h-6"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Fragment>
  )
}

ReactDOM.render(
  <QueryClientProvider client={queryClient}>
    <App />
    {/* <ReactQueryDevtools /> */}
  </QueryClientProvider>,
  document.getElementById('root'),
)
