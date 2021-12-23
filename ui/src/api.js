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

export default api
