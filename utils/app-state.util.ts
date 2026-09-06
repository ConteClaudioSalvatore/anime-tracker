import { AppState } from "@/model";
import React, { Dispatch, SetStateAction } from "react";

export const AppStateContext = React.createContext<{
  state: AppState;
  updateState: Dispatch<SetStateAction<AppState>>;
}>({ state: {}, updateState: (prev) => prev });
