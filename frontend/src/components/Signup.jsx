import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Paper from "@mui/material/Paper"
import Stack from "@mui/material/Stack"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"

export default function Signup({ form, errors, loading, onChange, onSubmit, onSwitchToLogin }) {
  return (
    <Paper className="auth-card" elevation={0}>
      <Stack spacing={2.5}>
        <Box>
          <Typography className="auth-kicker">DRIVER ACCESS</Typography>
          <Typography component="h1" className="auth-title">Sign up</Typography>
          <Typography className="auth-copy">Create your driver account to unlock the dashboard.</Typography>
        </Box>
        <Stack spacing={2} component="form" onSubmit={onSubmit}>
          <TextField label="Driver name" value={form.driverName} onChange={onChange("driverName")} error={Boolean(errors.driverName)} helperText={errors.driverName || " "} fullWidth />
          <TextField label="Email" type="email" value={form.email} onChange={onChange("email")} error={Boolean(errors.email)} helperText={errors.email || " "} fullWidth />
          <TextField label="Password" type="password" value={form.password} onChange={onChange("password")} error={Boolean(errors.password)} helperText={errors.password || " "} fullWidth />
          <TextField label="Vehicle number" value={form.vehicleNumber} onChange={onChange("vehicleNumber")} error={Boolean(errors.vehicleNumber)} helperText={errors.vehicleNumber || " "} fullWidth />
          <Button variant="contained" type="submit" disabled={loading}>{loading ? "Creating..." : "Create account"}</Button>
        </Stack>
        <Button variant="text" onClick={onSwitchToLogin}>Already have an account</Button>
      </Stack>
    </Paper>
  )
}
