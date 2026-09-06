import React from "react";
import { AccessoryContextType } from "../model/accessory-context.model";

export const AccessoryContext = React.createContext<AccessoryContextType>({
  webViewRef: null,
});
