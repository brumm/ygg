import hashObject from 'object-hash'

export const itemToId = ({ name, meta, types, directTypes, indirectTypes }) => {
  return hashObject({ name, meta, types, directTypes, indirectTypes })
}
