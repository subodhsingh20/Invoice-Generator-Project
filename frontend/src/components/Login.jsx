import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Paper from "@mui/material/Paper"
import Stack from "@mui/material/Stack"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import IconButton from "@mui/material/IconButton"
import InputAdornment from "@mui/material/InputAdornment"
import LockOutlined from "@mui/icons-material/LockOutlined"
import AlternateEmailOutlined from "@mui/icons-material/AlternateEmailOutlined"
import DirectionsCarOutlined from "@mui/icons-material/DirectionsCarOutlined"
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined"
import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined"
import { motion } from "framer-motion"
import { useState } from "react"

export default function Login({ form, errors, loading, onChange, onSubmit, onSwitchToSignup }) {
  const [showPassword, setShowPassword] = useState(false)
  return (
    <Paper className="auth-card" elevation={0}>
      <Stack spacing={2.5}>
        <Box className="auth-logo"><DirectionsCarOutlined /></Box>
        <Box>
          <Typography className="auth-kicker">DRIVER ACCESS</Typography>
          <Typography component="h1" className="auth-title">Welcome Back</Typography>
          <Typography className="auth-copy">Use your registered email and password to continue.</Typography>
        </Box>
        <Stack spacing={2} component="form" onSubmit={onSubmit}>
          <TextField label="Email" type="email" value={form.email} onChange={onChange("email")} error={Boolean(errors.email)} helperText={errors.email || " "} fullWidth slotProps={{ input: { startAdornment: <InputAdornment position="start"><AlternateEmailOutlined /></InputAdornment> } }} />
          <TextField label="Password" type={showPassword ? "text" : "password"} value={form.password} onChange={onChange("password")} error={Boolean(errors.password)} helperText={errors.password || " "} fullWidth slotProps={{ input: { startAdornment: <InputAdornment position="start"><LockOutlined /></InputAdornment>, endAdornment: <InputAdornment position="end"><IconButton type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)} edge="end">{showPassword ? <VisibilityOffOutlined /> : <VisibilityOutlined />}</IconButton></InputAdornment> } }} />
          <motion.div whileTap={{ scale: 0.97 }} whileHover={{ y: -2 }}><Button variant="contained" type="submit" disabled={loading} fullWidth>{loading ? "Logging in..." : "Login"}</Button></motion.div>
        </Stack>
        <motion.div whileTap={{ scale: 0.98 }}><Button className="auth-switch" variant="text" onClick={onSwitchToSignup}>Create a new account</Button></motion.div>
      </Stack>
    </Paper>
  )
}
