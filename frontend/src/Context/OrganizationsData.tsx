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

type OrganizationRow = {
  id?: number | string;
  organizationId?: string;
  organizationName?: string;
  organizationStatus?: string;
  hasAdmin?: boolean;
};

type OrganizationsState = {
  data: OrganizationRow[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
};

const organizationSlice = createSlice({
  name: "organizations",
  initialState: {
    data: [] as OrganizationRow[],
    status: "idle" as OrganizationsState["status"],
    error: null as string | null,
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
