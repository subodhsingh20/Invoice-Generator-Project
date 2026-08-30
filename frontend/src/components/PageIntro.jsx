import { memo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

// Shared, memoized page header block. In the New Bill view this block contains
// the LCP text paragraph. Because every prop is a primitive, the memo wrapper
// lets React skip rebuilding this subtree on each form keystroke.
function PageIntro({ eyebrow, step, title, copy, compact = false }) {
  return (
    <Box className={compact ? "intro compact-intro" : "intro"}>
      <Typography className="section-kicker">
        {eyebrow} <span>•</span> {step}
      </Typography>
      <Typography component="h1" variant="h1">
        {title}
      </Typography>
      <Typography className="intro-copy">{copy}</Typography>
    </Box>
  );
}

export default memo(PageIntro);
