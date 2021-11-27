export const isNotHidden = {
  'name.0': { $ne: '.' },
}

export const isApplication = {
  types: { $in: ['com.apple.application'] },
}

export const isFolder = {
  types: { $in: ['public.folder'] },
}

export const isNotAction = { types: { $not: { $in: ['action'] } } }

export const isAction = { types: { $in: ['action'] } }

export const inputTypes = (types) => ({
  inputTypes: { $in: types },
})
