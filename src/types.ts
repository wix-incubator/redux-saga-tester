import {
  AnyAction,
  CombinedState,
  Middleware,
  Reducer,
  ReducersMapObject,
} from 'redux';
import { Task } from '@redux-saga/types';

export type SagaFunction = (...args: unknown[]) => Iterator<any>;

export interface SagaTesterOptions<StateType> {
  initialState?: CombinedState<StateType>;
  reducers?: ReducersMapObject;
  middlewares?: Middleware[];
  combineReducers?: (map: ReducersMapObject<AnyAction>) => Reducer<CombinedState<StateType>>;
  ignoreReduxActions?: boolean;
  options?: object;
}

export interface SagaTesterOption2<StateType> {
  initialState?: StateType;
  reducers?: ReducersMapObject;
  middlewares?: Middleware[];
  combineReducers?: (map: ReducersMapObject) => Reducer<StateType>;
  ignoreReduxActions?: boolean;
  options?: object;
}

export default abstract class SagaTester<StateType> {
  // abstract constructor(options?: SagaTesterOptions<StateType>);

  /**
   * Starts execution of the provided saga.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract start(saga: SagaFunction, ...args: any[]): any;

  /**
   * Dispatches an action to the redux store.
   */
  abstract dispatch(action: AnyAction): void;

  /**
   * Assigns the newState into the current state. (Only works with the default reducer.)
   */
  abstract updateState(state: StateType): void;

  /**
   * Returns the state of the redux store.
   */
  abstract getState(): CombinedState<StateType>;

  /**
   * Returns a promise that will resolve if the specified action is dispatched to the store.
   * @param futureOnly Causes waitFor to only resolve if the action is called in the future.
   */
  abstract waitFor(actionType: string, futureOnly?: boolean): PromiseLike<void>;

  /**
   * Returns whether the specified was dispatched in the past.
   */
  abstract wasCalled(actionType: string): boolean;

  /**
   * Returns the number of times an action with the given type was dispatched.
   */
  abstract numCalled(actionType: string): number;

  /**
   * Returns the last action dispatched to the store.
   */
  abstract getLatestCalledAction(): AnyAction;

  /**
   * Returns an array of all actions dispatched.
   */
  abstract getCalledActions(): AnyAction[];

  /**
   * Reset the store state back to initialState
   * @param clearActionList Clears the history of past actions (defaults to false).
   */
  abstract reset(clearActionList?: boolean): void;
}
