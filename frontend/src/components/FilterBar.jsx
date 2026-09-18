import { memo } from "react";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import SearchOutlined from "@mui/icons-material/SearchOutlined";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const years = Array.from({ length: 7 }, (_, index) => 2024 + index);

function FilterBar({ filters, setFilters, onRefresh, loading }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1.5}
      className="filter-bar"
    >
      <FormControl className="earning-filter-field">
        <InputLabel id="earning-month-label">Month</InputLabel>
        <Select labelId="earning-month-label" label="Month" value={filters.month || ""} onChange={(event) => setFilters((current) => ({ ...current, month: event.target.value }))}>
          {months.map((month, index) => <MenuItem key={month} value={index + 1}>{month}</MenuItem>)}
        </Select>
      </FormControl>
      <FormControl className="earning-filter-field">
        <InputLabel id="earning-year-label">Year</InputLabel>
        <Select labelId="earning-year-label" label="Year" value={filters.year || ""} onChange={(event) => setFilters((current) => ({ ...current, year: event.target.value }))}>
          {years.map((year) => <MenuItem key={year} value={year}>{year}</MenuItem>)}
        </Select>
      </FormControl>
      <Button
        variant="contained"
        startIcon={<SearchOutlined />}
        onClick={onRefresh}
        disabled={loading}
      >
        Search
      </Button>
    </Stack>
  );
}

export default memo(FilterBar);
