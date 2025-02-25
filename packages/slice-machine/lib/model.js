import equal from 'fast-deep-equal'

const FieldHelpers = {
  toArray: (fields) =>
    Object.entries(fields)
    .reduce((acc, [key, value]) => ([
      ...acc,
      {
        key,
        value
      }
    ]), []),
  fromArray: (arr) => arr.reduce((acc, {
      key,
      value
    }) => ({
      ...acc,
      [key]: value
    }), {})
}

const formatModel = (model, variations) => ({
  ...model,
  variations: variations.map(variation => ({
    ...variation,
    primary: FieldHelpers.fromArray(variation.primary),
    items: FieldHelpers.fromArray(variation.items),
  }))
})

const createVariations = ({ variations }) => variations.map(variation => ({
  ...variation,
  items: variation.items ? FieldHelpers.toArray(variation.items) : [],
  primary: variation.primary ? FieldHelpers.toArray(variation.primary) : [],
}))

const deepEqual = (model, variations) => {
  const modelVariations = createVariations(model)
  const isEqual = modelVariations.every((modelVariation, i) => equal(modelVariation, variations[i]))
  return isEqual
}

const getMetadata = (model) =>
  Object.entries(model).reduce((acc, [key, value]) => ({
    ...acc,
    ...(['id', 'type', 'name', 'description'].includes(key) ? ({ [key]: value }) : {})
  }), {})

const createModel = (intialValues, initialInfo, initialMockConfig) => {
  let info = initialInfo
  let model = intialValues
  let meta = getMetadata(model)
  let variations = createVariations(intialValues)
  let mockConfig = initialMockConfig || {}

  const _reorder = (variation, zone) => (start, end) => {
    const result = Array.from(variation[zone])
    const [removed] = result.splice(start, 1);
    result.splice(end, 0, removed);
    variation[zone] = result
    return variation[zone]
  }

  const _replace = (variation, zone) => (key, newKey, value) => {
    const i = variation[zone].findIndex(e => e.key === key)
    if (i !== -1) {
      variation[zone][i] = {
        key: newKey,
        value
      }
      return variation[zone][i]
    }
    return null
  }

  const _delete = (variation, zone) => (key) => {
    const i = variation[zone].findIndex(e => e.key === key)
    if (i !== -1) {
      variation[zone].splice(i, 1)
    }
    return variation[zone]
  }

  const _add = (variation, zone) => (key, value) => {
    const newItem = { key, value }
    variation[zone].push(newItem)
    return newItem
  }

  return {
    resetInitialModel: (newInitialValues, newInfo, newMockConfig) => {
      model = newInitialValues
      info = { ...info, ...newInfo }
      mockConfig = newMockConfig
      variations = createVariations(newInitialValues)
    },
    updateMeta: (newMeta) => {
      info.meta = { ...info.meta, ...newMeta }
    },
    appendInfo: (newInfo) => {
      info = { ...info, ...newInfo }
    },
    get() {
      return {
        info,
        variations,
        mockConfig,
        updateMockConfig({ prevId, newId, fieldType, value }) {
          mockConfig = {
            ...mockConfig,
            [fieldType]: {
              ...mockConfig[fieldType],
              ...(prevId !== newId ? {
                [prevId]: undefined,
              } : null),
              [newId]: value
            }
          }
        },
        variation(id) {
          const variation = id ? variations.find(e => e.id === id) : variations[0]
          if (!variation) {
            return null
          }
          return {
            ...variation,
            add: {
              primary: _add(variation, 'primary'),
              items: _add(variation, 'items'),
            },
            reorder: {
              primary: _reorder(variation, 'primary'),
              items: _reorder(variation, 'items'),
            },
            replace: {
              primary: _replace(variation, 'primary'),
              items: _replace(variation, 'items'),
            },
            deleteMock: {
              primary(key) {
                if (mockConfig && mockConfig.primary) {
                  delete mockConfig.primary[key]
                }
              },
              items(key) {
                if (mockConfig && mockConfig.items) {
                  delete mockConfig.items[key]
                }
              },
            },
            delete: {
              primary(key) {
                _delete(variation, 'primary')(key)
                if (mockConfig && mockConfig.primary) {
                  delete mockConfig.primary[key]
                }
              },
              items(key) {
                _delete(variation, 'items')(key)
                if (mockConfig && mockConfig.items) {
                  delete mockConfig.items[key]
                }
              }
            },
          }
        },
        meta,
        value: formatModel(model, variations),
        isTouched: !deepEqual(model, variations) || !equal(initialMockConfig, mockConfig)
      }
    },
  }
}

export default createModel