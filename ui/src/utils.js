import { matchSorter } from 'match-sorter'

import api from './api'

const ITEM_FILTER_KEYS = ['name', 'details']
export const SLOT_NAMES = ['direct', 'action', 'indirect']

export const wrapAround = (value, bounds) =>
  ((value % bounds) + bounds) % bounds

const updateSlot = async (draft, slotName) => {
  switch (slotName) {
    case 'direct': {
      draft.direct.items = await api('/items/item-catalog/children')
      draft.direct.id = draft.direct.items[0].id
      break
    }

    case 'action': {
      draft.action.items = await api(`/items/${draft.direct.id}/actions`)
      draft.action.id = draft.action.items[0].id
      break
    }

    case 'indirect': {
      const actionItem = draft.action.items.find(
        (item) => item.id === draft.action.id,
      )
      const indirectItem = draft.indirect.items?.find(
        (item) => item.id === draft.indirect.id,
      )
      if (actionItem.indirectTypes) {
        draft.indirect.items = await api(
          `/items/${indirectItem?.id || 'item-catalog'}/actions/${
            draft.action.id
          }/indirects`,
        )

        draft.indirect.id = draft.indirect.items[0]?.id || null
      } else {
        draft.indirect.id = null
        draft.indirect.items = null
      }
      break
    }

    // no default
  }

  return draft
}

export const updateSlots = async (draft, slotNames = SLOT_NAMES) => {
  for (const slotName of slotNames) {
    await updateSlot(draft, slotName)
    draft[slotName].filterText = null
  }
}

export const initializeState = (draft) => {
  draft.activeSlot = 'direct'
  return draft
}

const clearState = (draft) => {
  draft.activeSlot = null
  draft.direct.id = null
  draft.direct.filterText = null
  draft.direct.items = null
  draft.action.id = null
  draft.action.filterText = null
  draft.action.items = null
  draft.indirect.id = null
  draft.indirect.filterText = null
  draft.indirect.items = null
  return draft
}

export const filterItems = async (
  draft,
  filterText,
  replaceFilterText = false,
) => {
  if (replaceFilterText) {
    draft.filterText = filterText
  } else {
    if (draft.filterText === null) {
      draft.filterText = filterText
    } else {
      draft.filterText += filterText
    }
  }

  if (replaceFilterText) {
    const item = draft.items.find((item) => item.id === draft.id)
    draft.items = await api(`/items/${item.parentId}/children`)
  }

  const filteredItems = matchSorter(draft.items, draft.filterText, {
    keys: ITEM_FILTER_KEYS,
  })

  if (filteredItems.length) {
    draft.items = filteredItems
    draft.id = draft.items[0].id
  }
}

export const startAfter = (slotName) =>
  SLOT_NAMES.slice(SLOT_NAMES.indexOf(slotName) + 1)

export const setId = (draft, id) => {
  draft.id = id
}

export const stepInto = async (draft) => {
  draft.items = await api(`/items/${draft.id}/children`)
  draft.id = draft.items[0].id
  draft.filterText = null
}

export const stepOutOf = async (draft) => {
  const item = draft.items.find((item) => item.id === draft.id)
  const parent = await api(`/items/${item.parentId}`)
  draft.items = await api(`/items/${parent.parentId}/children`)
  if (draft.filterText !== null) {
    draft.items = matchSorter(draft.items, draft.filterText, {
      keys: ITEM_FILTER_KEYS,
    })
  }
  draft.id = parent.id
}
