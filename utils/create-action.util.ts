import { ActionCreator } from "@/model";

export function createAction<
  TAction extends string,
  TParams extends any[],
  TPayload,
>(
  type: TAction,
  creator: (...p: TParams) => { payload: TPayload },
): ActionCreator<TAction, TParams, TPayload> {
  const fn = ((...args: TParams) => ({
    ...creator(...args),
    type,
  })) as ActionCreator<TAction, TParams, TPayload>;
  fn.type = type;
  return fn;
}
