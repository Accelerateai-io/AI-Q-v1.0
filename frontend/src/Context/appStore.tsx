import { configureStore } from "@reduxjs/toolkit";
import organizationReducer from "./OrganizationsData";

const appStore = configureStore({
  reducer: { organizations: organizationReducer },
});

export type RootState = ReturnType<typeof appStore.getState>;
export type AppDispatch = typeof appStore.dispatch;

export default appStore;
