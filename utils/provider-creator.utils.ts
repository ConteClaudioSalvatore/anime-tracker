import { ProviderCreatorContextType } from "@/model";
import React from "react";

export const ProviderCreatorContext =
  React.createContext<ProviderCreatorContextType | null>(null);

export const useProviderCreator = () => {
  const context = React.useContext(ProviderCreatorContext);
  if (!context) throw new Error("ProviderCreatorContext is not available");
  return context;
};
