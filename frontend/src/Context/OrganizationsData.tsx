import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
const BASE_URL = import.meta.env.VITE_BASE_URL;

export const getOrganizations = createAsyncThunk(
  "organizations/getOrganizations",
  async () => {
    const token = sessionStorage.getItem("bearerToken");
    // console.log("Token:", token);
    const response = await fetch(`${BASE_URL}/allOrganizations`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    // console.log(response)
    const result = await response.json();
    console.log(result);
    if (response.ok) {
      return result.data;
    }
  },
);

const organizationSlice = createSlice({
  name: "organizations",
  initialState: {
    data: [],
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getOrganizations.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(getOrganizations.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.data = action.payload;
      })
      .addCase(getOrganizations.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      });
  },
});

export default organizationSlice.reducer;
