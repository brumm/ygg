import React, { Fragment } from 'react'
import ReactDOM from 'react-dom'
import { useImmer } from 'use-immer'
import clsx from 'clsx'
import produce from 'immer'
import { useVirtual } from 'react-virtual'

import './index.css'
import api from './api'
import {
  wrapAround,
  updateSlots,
  initializeState,
  filterItems,
  startAfter,
  setId,
  stepInto,
  stepOutOf,
  SLOT_NAMES,
} from './utils'

console.clear()

const App = () => {
  const [state, setState] = useImmer({
    shouldReplaceActiveFilterText: false,
    activeSlot: null,

    direct: {
      id: null,
      items: null,
      filterText: null,
    },

    action: {
      id: null,
      items: null,
      filterText: null,
    },

    indirect: {
      id: null,
      items: null,
      filterText: null,
    },
  })

  const isEmptyState =
    state.activeSlot === null &&
    state.direct.id === null &&
    state.direct.filterText === null &&
    state.direct.items === null &&
    state.action.id === null &&
    state.action.filterText === null &&
    state.action.items === null &&
    state.indirect.id === null &&
    state.indirect.filterText === null &&
    state.indirect.items === null

  const childItems = state[state.activeSlot]?.items?.map((item) => ({
    ...item,
    active: item.id === state[state.activeSlot].id,
  }))

  const slotItems = SLOT_NAMES.filter((name) => state[name].id !== null).map(
    (name) => {
      let item = state[name].items?.find((item) => item.id === state[name].id)
      item = {
        ...item,
        active: name === state.activeSlot,
        slot: name,
        filterText: state[name].filterText,
      }

      return item || null
    },
  )

  const activeItemIndex = childItems?.findIndex(
    (item) => item.id === state[state.activeSlot].id,
  )
  const activeItem = childItems?.[activeItemIndex]

  const overflowContainerRef = React.useRef()
  const appContainerRef = React.useRef()

  const rowVirtualizer = useVirtual({
    size: childItems?.length || 0,
    parentRef: overflowContainerRef,
    estimateSize: React.useCallback(() => 64, []),
  })

  React.useLayoutEffect(() => {
    rowVirtualizer.scrollToIndex(activeItemIndex)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItemIndex])

  React.useLayoutEffect(() => {
    return window.app?.onHide(() => {
      if (!isEmptyState) {
        setState((draft) => {
          draft.shouldReplaceActiveFilterText = true
          draft.activeSlot = 'direct'
        })
      }
    })
  }, [setState, isEmptyState])

  React.useEffect(() => {
    const element = appContainerRef.current
    if (element) {
      const resizeObserver = new ResizeObserver(([entry]) => {
        window.app?.resize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      })

      resizeObserver.observe(element)
      return () => resizeObserver.unobserve(element)
    }
  }, [state.activeSlot])

  if (isEmptyState) {
    return (
      <Fragment>
        <KeyHandler
          enabled={(event) => {
            if (event.metaKey || event.ctrlKey || event.altKey) {
              return false
            }

            return 'abcdefghijklmnopqrstuvwxyz1234567890'.includes(
              event.key.toLowerCase(),
            )
          }}
          handler={async (event) => {
            event.preventDefault()
            setState(
              await produce(state, async (draft) => {
                await initializeState(draft)
                await updateSlots(draft)
                filterItems(draft[draft.activeSlot], event.key)
                await updateSlots(draft, startAfter(draft.activeSlot))
              }),
            )
          }}
        />

        <div
          className="inline-flex flex-col dark:bg-gray-800 dark:text-gray-400"
          ref={appContainerRef}
        >
          <EmptyState />
        </div>
      </Fragment>
    )
  }

  return (
    <Fragment>
      <KeyHandler
        enabled={(event) => event.code === 'Tab'}
        handler={async (event) => {
          event.preventDefault()
          setState((draft) => {
            const index = SLOT_NAMES.indexOf(draft.activeSlot)
            const bounds = draft.indirect.id === null ? 2 : 3
            const direction = event.shiftKey ? -1 : +1
            const nextIndex = wrapAround(index + direction, bounds)
            draft.activeSlot = SLOT_NAMES[nextIndex]
          })
        }}
      />

      <KeyHandler
        enabled={(event) => event.code === 'Backspace'}
        handler={async (event) => {
          event.preventDefault()

          setState(
            await produce(state, async (draft) => {
              await updateSlots(draft)
            }),
          )
        }}
      />

      <KeyHandler
        enabled={(event) =>
          event.code === 'ArrowDown' || event.code === 'ArrowUp'
        }
        handler={async (event) => {
          event.preventDefault()
          const direction = event.key === 'ArrowUp' ? -1 : +1

          const currentIndex = childItems.findIndex(
            (item) => item.id === activeItem.id,
          )
          const nextIndex = wrapAround(
            currentIndex + direction,
            childItems.length,
          )
          const nextItem = childItems[nextIndex]

          setState(
            await produce(state, async (draft) => {
              setId(draft[draft.activeSlot], nextItem.id)
              await updateSlots(draft, startAfter(draft.activeSlot))
            }),
          )
        }}
      />

      <KeyHandler
        enabled={(event) =>
          event.code === 'ArrowRight' && activeItem.hasChildren
        }
        handler={async (event) => {
          event.preventDefault()
          setState(
            await produce(state, async (draft) => {
              await stepInto(draft[draft.activeSlot])
              await updateSlots(draft, startAfter(draft.activeSlot))
            }),
          )
        }}
      />

      <KeyHandler
        enabled={(event) =>
          event.code === 'ArrowLeft' && activeItem.parentId !== 'item-catalog'
        }
        handler={async (event) => {
          event.preventDefault()
          setState(
            await produce(state, async (draft) => {
              await stepOutOf(draft[draft.activeSlot])
              await updateSlots(draft, startAfter(draft.activeSlot))
            }),
          )
        }}
      />

      <KeyHandler
        enabled={(event) => event.code === 'Enter'}
        handler={async (event) => {
          event.preventDefault()
          api('/execute-command', {
            method: 'post',
            body: JSON.stringify({
              directId: state.direct.id,
              actionId: state.action.id,
              indirectId: state.indirect.id,
            }),
          })
          // TODO check for errors before hiding
          window.app?.hide()
        }}
      />

      <KeyHandler
        enabled={(event) => {
          if (event.metaKey || event.ctrlKey || event.altKey) {
            return false
          }

          return 'abcdefghijklmnopqrstuvwxyz1234567890'.includes(
            event.key.toLowerCase(),
          )
        }}
        handler={async (event) => {
          event.preventDefault()
          setState(
            await produce(state, async (draft) => {
              filterItems(
                draft[draft.activeSlot],
                event.key,
                draft.shouldReplaceActiveFilterText,
              )
              await updateSlots(draft, startAfter(draft.activeSlot))
            }),
          )
        }}
      />

      <div
        className="inline-flex flex-col dark:bg-gray-800 dark:text-gray-400"
        ref={appContainerRef}
      >
        <Ygg
          childItems={childItems}
          slotItems={slotItems}
          overflowContainerRef={overflowContainerRef}
          rowVirtualizer={rowVirtualizer}
        />
      </div>
    </Fragment>
  )
}

const Ygg = ({
  childItems,
  slotItems,
  overflowContainerRef,
  rowVirtualizer,
}) => {
  return (
    <Fragment>
      <div className="relative inline-flex gap-4 p-4">
        {slotItems.map((item) => (
          <div
            key={item.id}
            className={clsx(
              'flex flex-col items-center justify-center rounded-md flex-shrink-0 w-[9.5rem] h-36 relative',
              {
                'dark:bg-gray-700/20': !item.active,
                'dark:bg-gray-700': item.active,
              },
            )}
          >
            {item.filterText && (
              <div className="absolute w-auto px-2 py-1 overflow-hidden text-xs bg-black bg-opacity-50 rounded rtl max-w-max top-2 left-2 right-2">
                {item.filterText}
              </div>
            )}

            <img
              className="w-24 h-24 rounded"
              src={`http://localhost:8080/items/${item?.id}/icon`}
              alt=""
            />

            <div className="flex items-center justify-center w-full px-4">
              <span className="truncate">
                {item.name}
                {item.indirectTypes?.length && '...'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <hr className="dark:border-gray-900" />

      <div
        ref={overflowContainerRef}
        className="w-full max-h-[calc(4rem*4.5)]"
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
            const item = childItems[virtualRow.index]

            return (
              <div
                key={virtualRow.index}
                className="absolute top-0 left-0 w-full"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div
                  className={clsx(
                    'flex h-16 items-center justify-between px-4 overflow-hidden gap-4',
                    {
                      'dark:bg-gray-700': item.active,
                    },
                  )}
                >
                  <img
                    className="w-10 h-10 rounded"
                    src={`http://localhost:8080/items/${item.id}/icon`}
                    alt=""
                  />

                  <div className="flex-auto truncate">
                    <div className="truncate">
                      {item.name}
                      {item.indirectTypes?.length && '...'}
                    </div>

                    <div className="truncate">
                      <span className="block text-sm truncate dark:text-gray-500">
                        {item.detail}
                      </span>
                    </div>
                  </div>

                  {item.hasChildren && (
                    <div className="flex-shrink-0 dark:text-gray-500">
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
    </Fragment>
  )
}

const EmptyState = () => (
  <div className="inline-flex flex-col dark:bg-gray-800 dark:text-gray-400">
    <div className="relative inline-flex gap-4 p-4">
      <div className="flex flex-col items-center justify-center rounded-md flex-shrink-0 w-[9.5rem] h-36 relative dark:bg-gray-700">
        <div className="flex items-center justify-center w-full px-4">
          <span className="truncate">Search</span>
        </div>
      </div>
      <div className="rounded-md flex-shrink-0 w-[9.5rem] h-36 relative dark:bg-gray-700/20"></div>
    </div>
  </div>
)

const KeyHandler = ({ enabled, handler }) => {
  React.useLayoutEffect(() => {
    const foo = (event) => {
      if (enabled(event)) {
        handler(event)
      }
    }

    document.addEventListener('keydown', foo)
    return () => document.removeEventListener('keydown', foo)
  }, [enabled, handler])

  return null
}

ReactDOM.render(<App />, document.getElementById('root'))
