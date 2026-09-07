import { ProviderCreatorContextType } from "@/model";
import React from "react";

export const ProviderCreatorContext =
  React.createContext<ProviderCreatorContextType | null>(null);

export const useProviderCreator = () => {
  const context = React.useContext(ProviderCreatorContext);
  if (!context) return null;
  return context;
};
