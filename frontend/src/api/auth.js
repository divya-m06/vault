const getApiBaseUrl = () => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

  if (!baseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured.')
  }

  return baseUrl.replace(/\/$/, '')
}

const buildUrl = (path) => `${getApiBaseUrl()}${path}`

const parseErrorMessage = async (response) => {
  try {
    const data = await response.json()
    if (typeof data?.detail === 'string') {
      return data.detail
    }
    if (typeof data?.message === 'string') {
      return data.message
    }
  } catch {
    // Ignore JSON parse issues and fall back to the default message.
  }

  return 'Request failed. Please try again.'
}

export async function registerUser(email, password) {
  const response = await fetch(buildUrl('/register'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  return response.json()
}

export async function loginUser(email, password) {
  const response = await fetch(buildUrl('/login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  return response.json()
}
