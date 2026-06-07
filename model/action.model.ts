export type Action<
  TAction extends string,
  TPayload = never,
> = TPayload extends never
  ? {
      type: TAction;
    }
  : {
      type: TAction;
      payload: TPayload;
    };

export interface ActionCreator<
  TAction extends string,
  TArguments extends any[],
  TPayload = never,
> {
  type: TAction;
  (...args: TArguments): Action<TAction, TPayload>;
}
