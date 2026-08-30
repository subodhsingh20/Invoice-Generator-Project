import jwt from 'jsonwebtoken'

export default function requireDriver(request, response, next) {
  const authorization = request.headers.authorization || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null

  if (!token) {
    return response.status(401).json({ error: 'Authorization token is required' })
  }

  try {
    if (!process.env.JWT_SECRET) {
      return response.status(500).json({ error: 'JWT_SECRET is not configured' })
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (!payload.driverId || payload.role !== 'driver') {
      return response.status(401).json({ error: 'Invalid token' })
    }
    request.user = { driverId: payload.driverId, role: payload.role }
    return next()
  } catch {
    return response.status(401).json({ error: 'Invalid or expired token' })
  }
}
