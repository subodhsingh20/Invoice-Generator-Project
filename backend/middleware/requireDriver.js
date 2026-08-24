import jwt from 'jsonwebtoken'

export default function requireDriver(request, response, next) {
  const authorization = request.headers.authorization || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null

  if (!token) return response.status(401).json({ error: 'Driver authentication required' })

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (!payload.driverId || payload.role !== 'driver') return response.status(403).json({ error: 'A driver token is required' })
    request.driver = payload
    return next()
  } catch {
    return response.status(401).json({ error: 'Invalid or expired driver token' })
  }
}