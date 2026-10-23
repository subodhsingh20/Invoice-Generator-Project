import Driver from '../models/Driver.js'
import authenticateAppId from './appIdAuth.js'

export default function requireDriver(request, response, next) {
  return authenticateAppId(request, response, () => {
    const subject = request.appIdAuthorizationContext.identityTokenPayload.sub
    Driver.findOne({ appIdSub: subject })
      .then((driver) => {
        if (!driver) return response.status(403).json({ error: 'Complete driver profile setup before continuing' })
        request.user = { driverId: String(driver._id), role: 'driver' }
        return next()
      })
      .catch((error) => {
        console.error('App ID driver lookup failed:', error?.message || 'Unknown error')
        return response.status(500).json({ error: 'Unable to load driver account' })
      })
  })
}
