import { configureStore } from "@reduxjs/toolkit";

import organizationReducer from "./OrganizationsData"

export default configureStore({
    reducer:{organizations:organizationReducer}
})