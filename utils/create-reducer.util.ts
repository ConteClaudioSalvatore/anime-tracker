import { Action } from "@/model";

export function createReducer<TState extends object>(
  ...reducers: Record<
    string,
    (state: TState, action: Action<string>) => TState
  >[]
) {
  const map = reducers.reduce(
    (acc, curr) => {
      const entries = Object.entries(curr);
      for (const [action, reducer] of entries) {
        acc[action] = [...(acc[action] ?? []), reducer];
      }
      return acc;
    },
    {} as Record<string, ((state: TState, a: Action<string>) => TState)[]>,
  );
  return <TAction extends string, TPayload>(
    state: TState,
    a: Action<TAction, TPayload>,
  ): TState => {
    let mutatedState: TState = state;
    const reducers = map[(a as any).type];
    reducers.forEach((r) => {
      mutatedState = r(mutatedState, a as unknown as Action<string>) as TState;
    });
    return mutatedState;
  };
}
