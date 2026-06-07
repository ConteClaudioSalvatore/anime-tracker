import { Action, ActionCreator } from "@/model";

export function on<
  TState extends object,
  TAction extends string,
  TArgs extends any[],
  TPayload,
>(
  action: ActionCreator<TAction, TArgs, TPayload>,
  reducer: (state: TState, action: Action<TAction, TPayload>) => TState,
): { [k: string]: (state: TState, action: Action<string>) => TState };
export function on<
  TState extends object,
  TActions extends ActionCreator<string, any[], any>,
>(
  ...params: [
    ...actions: TActions[],
    reducer: (state: TState, action: ReturnType<TActions>) => TState,
  ]
): { [k: string]: (state: TState, action: Action<string>) => TState };
export function on<TState extends object>(
  ...params: any[]
): { [k: string]: (state: TState, action: Action<string>) => TState } {
  const actions = params.slice(0, -1) as ActionCreator<string, any[], any>[];
  const reducer = params.pop() as (
    state: TState,
    action: Action<string>,
  ) => TState;
  return actions.reduce(
    (acc, curr) => ({
      ...acc,
      [curr.type]: reducer,
    }),
    {},
  ) as {
    [k: string]: (state: TState, action: Action<string>) => TState;
  };
}
