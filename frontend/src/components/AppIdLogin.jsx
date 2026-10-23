import { useEffect, useState } from "react"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Paper from "@mui/material/Paper"
import Stack from "@mui/material/Stack"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import DirectionsCarOutlined from "@mui/icons-material/DirectionsCarOutlined"
import AppID from "ibmcloud-appid-js"

let appIdClientPromise

function getAppIdClient() {
  const clientId = import.meta.env.VITE_APPID_CLIENT_ID
  const discoveryEndpoint = import.meta.env.VITE_APPID_DISCOVERY_ENDPOINT
  if (!clientId || !discoveryEndpoint) {
    throw new Error("IBM Cloud App ID is not configured for this frontend")
  }
  if (!appIdClientPromise) {
    const client = new AppID()
    appIdClientPromise = client
      .init({ clientId, discoveryEndpoint })
      .then(() => client)
      .catch((error) => {
        appIdClientPromise = null
        throw error
      })
  }
  return appIdClientPromise
}

export default function AppIdLogin({ apiUrl, onAuthenticated }) {
  const [appIdClient, setAppIdClient] = useState(null)
  const [tokens, setTokens] = useState(null)
  const [driverName, setDriverName] = useState("")
  const [vehicleNumber, setVehicleNumber] = useState("")
  const [setupRequired, setSetupRequired] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    getAppIdClient()
      .then((client) => {
        if (active) setAppIdClient(client)
      })
      .catch((initializationError) => {
        if (active) setError(initializationError.message || "Unable to initialize IBM Cloud App ID")
      })
    return () => {
      active = false
    }
  }, [])

  const submitSession = async (appIdTokens, profile = {}) => {
    const response = await fetch(`${apiUrl}/auth/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${appIdTokens.accessToken} ${appIdTokens.idToken}`,
      },
      body: JSON.stringify(profile),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || "Unable to sign in")
    if (data.setupRequired) {
      setTokens(appIdTokens)
      setDriverName(data.suggestedDriverName || "")
      setSetupRequired(true)
      return
    }
    onAuthenticated(appIdTokens, data.driver)
  }

  const signIn = async () => {
    setLoading(true)
    setError("")
    try {
      if (!appIdClient) throw new Error("IBM Cloud App ID is not ready")
      const appIdTokens = await appIdClient.signin()
      await submitSession(appIdTokens)
    } catch (signInError) {
      setError(signInError.message || "Unable to sign in with IBM Cloud App ID")
    } finally {
      setLoading(false)
    }
  }

  const completeProfile = async (event) => {
    event.preventDefault()
    if (!driverName.trim() || !vehicleNumber.trim()) {
      setError("Driver name and vehicle number are required")
      return
    }
    if (!tokens) {
      setError("Your sign-in has expired. Please sign in again.")
      setSetupRequired(false)
      return
    }

    setLoading(true)
    setError("")
    try {
      await submitSession(tokens, { driverName, vehicleNumber })
    } catch (setupError) {
      setError(setupError.message || "Unable to save driver profile")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Paper className="auth-card" elevation={0}>
      <Stack spacing={2.5}>
        <Box className="auth-logo"><DirectionsCarOutlined /></Box>
        <Box>
          <Typography className="auth-kicker">DRIVER ACCESS</Typography>
          <Typography component="h1" className="auth-title">
            {setupRequired ? "Set up your driver profile" : "Welcome to Easy Bill"}
          </Typography>
          <Typography className="auth-copy">
            {setupRequired
              ? "Add your driver and vehicle details to create your account."
              : "Sign in securely using your IBM Cloud App ID account."}
          </Typography>
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        {setupRequired ? (
          <Stack component="form" spacing={2} onSubmit={completeProfile}>
            <TextField
              label="Driver name"
              value={driverName}
              onChange={(event) => setDriverName(event.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Vehicle number"
              value={vehicleNumber}
              onChange={(event) => setVehicleNumber(event.target.value)}
              required
              fullWidth
            />
            <Button variant="contained" type="submit" disabled={loading} fullWidth>
              {loading ? "Saving profile..." : "Create account"}
            </Button>
          </Stack>
        ) : (
          <Button variant="contained" onClick={signIn} disabled={loading || !appIdClient} fullWidth>
            {loading || !appIdClient ? "Connecting to App ID..." : "Sign in with IBM Cloud App ID"}
          </Button>
        )}
      </Stack>
    </Paper>
  )
}
