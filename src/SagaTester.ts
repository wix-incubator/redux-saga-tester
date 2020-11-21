import createSagaMiddleware from 'redux-saga';

import {
  combineReducers as reduxCombineReducers,
  createStore,
  applyMiddleware,
  AnyAction,
  Reducer,
  Store,
  ReducersMapObject,
} from 'redux';
import { Saga } from '@redux-saga/types';
import { SagaMiddleware } from '@redux-saga/core';
import SagaTester, { SagaFunction, SagaTesterOptions } from './types';
import {
  RESET_TESTER_ACTION_TYPE,
  SET_STATE_TYPE,
  UPDATE_STATE_TYPE,
} from './constants';

export const resetAction = { type: RESET_TESTER_ACTION_TYPE };

interface Action {
  callback?: (value?: void | PromiseLike<void> | undefined) => void;
  reject?: (e: Error) => void;
  count: number;
  promise?: PromiseLike<void>;
}

export default class SagaIntegrationTester<S extends object> extends SagaTester<
  S
> {
  private calledActions: AnyAction[];

  private actionLookups: { [key: string]: Action };

  private sagaMiddleware: SagaMiddleware;

  private store: Store;

  constructor(
    props: Partial<SagaTesterOptions<S>> = {
      reducers: {},
      middlewares: [],
      combineReducers: reduxCombineReducers,
      ignoreReduxActions: true,
      options: {},
    }
  ) {
    super();
    const {
      reducers,
      middlewares = [],
      combineReducers = reduxCombineReducers,
      ignoreReduxActions,
      options = {},
      initialState = {},
    } = props;
    this.calledActions = [];
    this.actionLookups = {};
    this.sagaMiddleware = createSagaMiddleware(options);
    const defaultReducers: (
      state: object
    ) => ReducersMapObject = (init: {}) => {
      const red: ReducersMapObject = {};
      console.log(init)
      for (const [key, value] of Object.entries(init)) {
        red[key] = (state: unknown = value, _action: AnyAction) => state;
      }
      return red;
    };
    const reducerFn = combineReducers(
      reducers ?? defaultReducers(initialState)
    );
    const finalInitialState: S = createStore(
      reducerFn,
      initialState
    ).getState();

    const finalReducer: Reducer<S> = (
      state: S | undefined,
      action: AnyAction
    ): S => {
      // reset state if requested
      if (action.type === RESET_TESTER_ACTION_TYPE) return finalInitialState;

      // supply identity reducer as default
      if (!reducerFn) {
        let stateUpdate = {};

        if ([SET_STATE_TYPE, UPDATE_STATE_TYPE].includes(action.type)) {
          stateUpdate = action.payload!;
        }

        return Object.assign({}, finalInitialState, stateUpdate);
      }

      // otherwise use the provided reducer
      return reducerFn(state, action);
    };

    // Middleware to store the actions and create promises
    const testerMiddleware = () => (next: (arg0: AnyAction) => AnyAction) => (
      action: AnyAction
    ) => {
      if (
        (ignoreReduxActions && action.type.startsWith('@@redux/')) ||
        action.type === UPDATE_STATE_TYPE
      ) {
        // Don't monitor redux actions
      } else {
        this.calledActions.push(action);
        const actionObj = this._addAction(action.type);
        actionObj.count++;
        actionObj.callback!();
      }
      return next(action);
    };

    const allMiddlewares = [
      ...middlewares,
      testerMiddleware,
      this.sagaMiddleware,
    ];
    this.store = createStore(finalReducer, applyMiddleware(...allMiddlewares));
  }

  _handleRootSagaException(e: Error) {
    Object.values(this.actionLookups).forEach(action => action.reject!(e));
  }

  _addAction(actionType: string, futureOnly = false) {
    let action = this.actionLookups[actionType];

    if (!action || futureOnly) {
      action = { count: 0 };
      action.promise = new Promise(function(resolve, reject) {
        action.callback = resolve;
        action.reject = reject;
      });
      this.actionLookups[actionType] = action;
    }

    return action;
  }

  _verifyAwaitedActionsCalled() {
    Object.keys(this.actionLookups).forEach(actionType => {
      const action = this.actionLookups[actionType];
      if (action.count === 0 && action.reject) {
        action.reject(
          new Error(actionType + ' was waited for but never called')
        );
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run(sagas: Saga<any[]>, ...args: unknown[]) {
    const task = this.start(sagas, ...args);
    if (task.result != null) {
      return task.result;
    } else {
      return task.toPromise();
    }
  }

  start(sagas: Saga<any[]>, ...args: unknown[]) {
    const task = this.sagaMiddleware.run(sagas, ...args);
    const onDone = () => this._verifyAwaitedActionsCalled();
    const onCatch = (e: Error) => this._handleRootSagaException(e);

    const taskPromise = task.toPromise();
    taskPromise.then(onDone);
    taskPromise.catch(onCatch);
    return task;
  }

  reset(clearActionList = false) {
    this.store.dispatch(resetAction);
    if (clearActionList) {
      // Clear existing array in case there are other references to it
      this.calledActions.length = 0;
      // Delete object keys in case there are other references to it
      Object.keys(this.actionLookups).forEach(
        key => delete this.actionLookups[key]
      );
    }
  }

  dispatch(action: AnyAction) {
    return this.store.dispatch(action);
  }

  getState(): S {
    return this.store.getState();
  }

  updateState(newState: Partial<S>) {
    this.store.dispatch({ type: UPDATE_STATE_TYPE, payload: newState });
  }

  getCalledActions() {
    return this.calledActions.slice(); // shallow copy
  }

  getLatestCalledAction() {
    return this.calledActions[this.calledActions.length - 1];
  }

  getLatestCalledActions(num = 1) {
    return this.calledActions.slice(-1 * num);
  }

  wasCalled(actionType: string) {
    const action = this.actionLookups[actionType];

    return action ? action.count > 0 : false;
  }

  numCalled(actionType: string) {
    const action = this.actionLookups[actionType];

    return (action && action.count) || 0;
  }

  waitFor(actionType: string, futureOnly = false) {
    return this._addAction(actionType, futureOnly).promise!;
  }
}
