import React, { Fragment } from 'react'
import ReactDOM from 'react-dom'
import { QueryClient, QueryClientProvider, useQueries } from 'react-query'
import { ReactQueryDevtools } from 'react-query/devtools'
import { matchSorter } from 'match-sorter'
import { useImmer } from 'use-immer'
import { useVirtual } from 'react-virtual'

import './index.css'
import clsx from 'clsx'
import { wrapAround } from '../../server/utils'

console.clear()

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

const App = ({
  itemCatalogId = 'item-catalog',
  actionCatalogId = 'action-catalog',
}) => {
  const [didJustShow, setDidJustShow] = useImmer(false)
  const [parentIndex, setParentIndex] = useImmer(0)
  const [filterTexts, setFilterTexts] = useImmer(['', '', ''])
  const [parentIds, setParentIds] = useImmer([null, null, null])
  const [childIds, setChildIds] = useImmer([null, null, null])

  // actions are never hasChildren:true, their parentId is never used
  // prettier-ignore
  const [directParentId, actionParentId /* actionParentId is unused */, indirectParentId] = parentIds
  const [directChildId, actionChildId, indirectChildId] = childIds

  const selectedChildId = childIds[parentIndex]

  const itemsQueries = useQueries([
    {
      queryKey: ['direct children', { directParentId }],
      queryFn: async () =>
        api(`/items/${directParentId ?? itemCatalogId}/children`),
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
          return api(`/items/${indirectParentId ?? itemCatalogId}/children`)
        }

        return api(
          `/items/${
            indirectChildId ?? itemCatalogId
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

  const parentRef = React.useRef()

  const rowVirtualizer = useVirtual({
    size: filteredListItems[parentIndex].length,
    parentRef,
    estimateSize: React.useCallback(() => 64, []),
  })

  React.useEffect(() => {
    return window.app?.onShow(() => {
      setDidJustShow(true)
      setParentIndex(0)
    })
  }, [setDidJustShow, setParentIndex])

  // --- clear a lists filter text when its parent changes

  React.useLayoutEffect(() => {
    setFilterTexts((draft) => {
      draft[0] = ''
    })
  }, [directParentId, setFilterTexts])

  // actions can't descend into other actions, so parent never changes

  React.useLayoutEffect(() => {
    setFilterTexts((draft) => {
      draft[2] = ''
    })
  }, [indirectParentId, setFilterTexts])

  // --- clear a down-stream filterText when the selected child changes

  // direct has no up-stream child

  React.useLayoutEffect(() => {
    setFilterTexts((draft) => {
      draft[1] = ''
    })
  }, [directChildId, setFilterTexts])

  React.useLayoutEffect(() => {
    setFilterTexts((draft) => {
      draft[2] = ''
    })
  }, [actionChildId, setFilterTexts])

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
      setChildIds((draft) => {
        draft[0] = firstDirectChildListItemId
      })
    }
  }, [firstDirectChildListItemId, setChildIds])

  // select first item of action list
  React.useLayoutEffect(() => {
    if (firstActionChildListItemId) {
      setChildIds((draft) => {
        draft[1] = firstActionChildListItemId
      })
    }
  }, [
    firstActionChildListItemId,
    firstDirectChildListItemId,
    directChildId,
    setChildIds,
  ])

  // select first item of indirect list
  React.useLayoutEffect(() => {
    if (firstIndirectChildListItemId) {
      setChildIds((draft) => {
        draft[2] = firstIndirectChildListItemId
      })
    }
  }, [
    firstIndirectChildListItemId,
    firstDirectChildListItemId,
    actionChildId,
    setChildIds,
  ])

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
          // console.log(event.altKey)

          const item = filteredListItems[parentIndex].find(
            (item) => item.id === selectedChildId,
          )

          if (item.hasChildren === true) {
            setParentIds((draft) => {
              draft[parentIndex] = selectedChildId
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

          const { parentId: itemParentId } = await api(
            `/items/${parentId || itemCatalogId}`,
          )

          setParentIds((draft) => {
            // TODO this assumes (correctly) that actions will never have children
            draft[parentIndex] =
              itemParentId === itemCatalogId ? null : itemParentId
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

          setChildIds((draft) => {
            draft[parentIndex] = nextItem?.id
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
          setFilterTexts((draft) => {
            draft[parentIndex] = ''
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
            setParentIds((draft) => {
              draft[parentIndex] = itemCatalogId
            })
            if (didJustShow) {
              setFilterTexts((draft) => {
                draft[parentIndex] = event.key.toLowerCase()
              })
              setDidJustShow(false)
            } else {
              setFilterTexts((draft) => {
                draft[parentIndex] += event.key.toLowerCase()
              })
            }
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
    itemCatalogId,
    itemsQueries,
    parentIds,
    parentIndex,
    selectedChildId,
    setChildIds,
    setFilterTexts,
    setParentIds,
    setParentIndex,
    shouldShowIndirect,
    didJustShow,
    setDidJustShow,
  ])

  React.useLayoutEffect(() => {
    window.app?.resize({
      width: shouldShowIndirect ? 520 : 352,
    })
  }, [shouldShowIndirect])

  React.useLayoutEffect(() => {
    window.app?.resize({
      height:
        177 +
        Math.max(Math.min(5, filteredListItems[parentIndex]?.length), 1) * 64,
    })
  }, [filteredListItems, parentIndex])

  const currentIndex = filteredListItems[parentIndex].findIndex(
    (item) => item.id === selectedChildId,
  )
  React.useEffect(() => {
    rowVirtualizer.scrollToIndex(currentIndex)
  }, [currentIndex])

  return (
    <Fragment>
      <div className="flex flex-col w-screen h-screen text-gray-400 bg-gray-800">
        <div className="relative inline-flex gap-4 p-4">
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
                  'flex flex-col items-center justify-center rounded-md flex-shrink-0 w-[9.5rem] h-36 relative',
                  {
                    'bg-gray-700': isSelected,
                  },
                )}
              >
                {filterTexts[itemIndex] && (
                  <div className="absolute w-auto px-2 py-1 overflow-hidden text-xs bg-black bg-opacity-50 rounded rtl max-w-max top-2 left-2 right-2">
                    {filterTexts[itemIndex]}
                  </div>
                )}

                {itemIndex === 1 && item
                  ? item && (
                      <img
                        className="w-24 h-24 rounded"
                        src={`http://localhost:8080/actions/${item?.id}/icon`}
                        alt=""
                      />
                    )
                  : item && (
                      <img
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

        <hr className="border-gray-900" />

        <div
          ref={parentRef}
          className="w-full h-full"
          style={{
            overflow: 'auto',
          }}
        >
          <div
            className="relative w-full"
            style={{
              height: `${rowVirtualizer.totalSize}px`,
            }}
          >
            {rowVirtualizer.virtualItems.map((virtualRow) => {
              const item = filteredListItems[parentIndex][virtualRow.index]
              const isSelected = item.id === selectedChildId

              return (
                <div
                  key={virtualRow.index}
                  className="absolute top-0 left-0 w-full"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  onClick={() =>
                    setChildIds((draft) => {
                      draft[parentIndex] = item.id
                    })
                  }
                >
                  <div
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
                            className="w-10 h-10 rounded"
                            src={`http://localhost:8080/actions/${item?.id}/icon`}
                            alt=""
                          />
                        )
                      : item && (
                          <img
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
                </div>
              )
            })}
          </div>
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
