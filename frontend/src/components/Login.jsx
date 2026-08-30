import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Paper from "@mui/material/Paper"
import Stack from "@mui/material/Stack"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"

export default function Login({ form, errors, loading, onChange, onSubmit, onSwitchToSignup }) {
  return (
    <Paper className="auth-card" elevation={0}>
      <Stack spacing={2.5}>
        <Box>
          <Typography className="auth-kicker">DRIVER ACCESS</Typography>
          <Typography component="h1" className="auth-title">Login</Typography>
          <Typography className="auth-copy">Use your registered email and password to continue.</Typography>
        </Box>
        <Stack spacing={2} component="form" onSubmit={onSubmit}>
          <TextField label="Email" type="email" value={form.email} onChange={onChange("email")} error={Boolean(errors.email)} helperText={errors.email || " "} fullWidth />
          <TextField label="Password" type="password" value={form.password} onChange={onChange("password")} error={Boolean(errors.password)} helperText={errors.password || " "} fullWidth />
          <Button variant="contained" type="submit" disabled={loading}>{loading ? "Logging in..." : "Login"}</Button>
        </Stack>
        <Button variant="text" onClick={onSwitchToSignup}>Create a new account</Button>
      </Stack>
    </Paper>
  )
}
