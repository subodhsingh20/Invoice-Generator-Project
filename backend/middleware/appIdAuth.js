import { createRemoteJWKSet, errors, jwtVerify } from 'jose'

let appIdConfigurationPromise

async function getAppIdConfiguration() {
  const discoveryEndpoint = process.env.APPID_DISCOVERY_ENDPOINT
  const clientId = process.env.APPID_CLIENT_ID
  if (!discoveryEndpoint || !clientId) {
    throw new Error('APPID_DISCOVERY_ENDPOINT and APPID_CLIENT_ID must be configured')
  }

  if (!appIdConfigurationPromise) {
    appIdConfigurationPromise = (async () => {
      const discoveryUrl = new URL(discoveryEndpoint)
      if (discoveryUrl.protocol !== 'https:') {
        throw new Error('App ID discovery endpoint must use HTTPS')
      }
      const response = await fetch(discoveryUrl, { signal: AbortSignal.timeout(5000) })
      if (!response.ok) throw new Error(`App ID discovery request failed with status ${response.status}`)

      const discovery = await response.json()
      if (typeof discovery.issuer !== 'string' || typeof discovery.jwks_uri !== 'string') {
        throw new Error('App ID discovery document is missing issuer or signing keys')
      }
      const jwksUrl = new URL(discovery.jwks_uri)
      if (jwksUrl.protocol !== 'https:') {
        throw new Error('App ID signing keys endpoint must use HTTPS')
      }

      return {
        clientId,
        issuer: discovery.issuer,
        jwks: createRemoteJWKSet(jwksUrl),
      }
    })()
  }

  try {
    return await appIdConfigurationPromise
  } catch (error) {
    appIdConfigurationPromise = undefined
    throw error
  }
}

export default async function authenticateAppId(request, response, next) {
  const authorization = request.headers.authorization || ''
  const parts = authorization.split(/\s+/)
  if (parts.length !== 3 || parts[0] !== 'Bearer' || !parts[1] || !parts[2]) {
    return response.status(401).json({ error: 'Valid App ID access and identity tokens are required' })
  }

  try {
    const { clientId, issuer, jwks } = await getAppIdConfiguration()
    const verifyOptions = { issuer, audience: clientId, algorithms: ['RS256'] }
    const [access, identity] = await Promise.all([
      jwtVerify(parts[1], jwks, verifyOptions),
      jwtVerify(parts[2], jwks, verifyOptions),
    ])
    const scopes = typeof access.payload.scope === 'string' ? access.payload.scope.split(/\s+/) : []
    if (!scopes.includes('appid_default')) {
      return response.status(401).json({ error: 'App ID access token is missing the required scope' })
    }
    if (typeof identity.payload.sub !== 'string' || !identity.payload.sub) {
      return response.status(401).json({ error: 'App ID identity token is missing its subject' })
    }

    request.appIdAuthorizationContext = {
      accessTokenPayload: access.payload,
      identityTokenPayload: identity.payload,
    }
    return next()
  } catch (error) {
    if (
      error instanceof errors.JOSEError &&
      !(error instanceof errors.JWKSTimeout) &&
      !(error instanceof errors.JWKSInvalid)
    ) {
      return response.status(401).json({ error: 'App ID token is invalid or expired' })
    }
    console.error('App ID token verification failed:', error?.message || 'Unknown error')
    return response.status(503).json({ error: 'App ID authentication is temporarily unavailable' })
  }
}
