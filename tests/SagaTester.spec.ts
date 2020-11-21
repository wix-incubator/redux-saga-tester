import SagaTester, { resetAction } from '../src/SagaTester';
import { Reducer } from 'redux';

describe('SagaTester', () => {
  const someInitialValue = 'SOME_INITIAL_VALUE';
  const someInitialState = { someKey: someInitialValue };
  const someActionType = 'SOME_ACTION_TYPE';
  const otherActionType = 'OTHER_ACTION_TYPE';
  const anotherActionType = 'ANOTHER_ACTION_TYPE';
  const reduxActionType = '@@redux/ACTION_TYPE';
  const someAction = { type: someActionType };
  const otherAction = { type: otherActionType };
  const anotherAction = { type: anotherActionType };
  const reduxAction = { type: reduxActionType };

  it('Accepts empty arguments', () => {
    expect(() => new SagaTester()).not.toThrow();
  });

  it('Accepts an empty object as an argument', () => {
    expect(() => new SagaTester()).not.toThrow();
  });

  it('Populates store with a given initial state', () => {
    const sagaTester = new SagaTester({ initialState: someInitialState });
    expect(sagaTester.getState()).toStrictEqual(someInitialState);
  });

  it('Saves a list of actions and returns it in order', () => {
    const sagaTester = new SagaTester();
    sagaTester.dispatch(someAction);
    sagaTester.dispatch(otherAction);
    expect(sagaTester.getCalledActions()).toStrictEqual([
      someAction,
      otherAction,
    ]);
  });

  it('Does not return internal reference to the list of actions', () => {
    const sagaTester = new SagaTester();
    sagaTester.dispatch(someAction);
    sagaTester.dispatch(otherAction);
    sagaTester.getCalledActions().reverse();
    expect(sagaTester.getCalledActions()).toStrictEqual([
      someAction,
      otherAction,
    ]);
  });

  it('Ignores redux action types by default', () => {
    const sagaTester = new SagaTester();
    sagaTester.dispatch(reduxAction);
    expect(sagaTester.getCalledActions()).toStrictEqual([]);
  });

  it('Dispatch returns the result of dispatching the action', () => {
    const sagaTester = new SagaTester();
    const action = sagaTester.dispatch(reduxAction);
    expect(action).toEqual(reduxAction);
  });

  it('Captures redux action types if configured', () => {
    const sagaTester = new SagaTester({ ignoreReduxActions: false });
    sagaTester.dispatch(reduxAction);
    expect(sagaTester.getCalledActions()).toStrictEqual([reduxAction]);
  });

  it('Uses the supplied reducers', () => {
    const someFinalValue = 'SOME_FINAL_VALUE';
    const reducers = {
      someKey: (state = someInitialValue, action: { type: string }) =>
        action.type === someActionType ? someFinalValue : state,
      someOtherKey: () => 1234,
    };

    const sagaTester = new SagaTester({ reducers });
    sagaTester.dispatch(someAction);
    expect(sagaTester.getState()).toStrictEqual({
      someKey: someFinalValue,
      someOtherKey: 1234,
    });
  });

  // it('Uses a reducer as a function if provided', () => {
  //   let wasReducerCalled = false;
  //   const reducerFn = () => (wasReducerCalled = true);
  //
  //   // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  //   // @ts-ignore
  //   const sagaTester = new SagaTester({ reducers: reducerFn });
  //   expect(wasReducerCalled).toBeFalsy();
  //   sagaTester.dispatch(someAction);
  //   expect(wasReducerCalled).toBeTruthy();
  // });

  it('Uses the supplied middlewares', () => {
    let flag = false;
    const middlewares = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => (next: (arg0: any) => any) => (action: any) => {
        flag = true;
        return next(action);
      },
    ];
    const sagaTester = new SagaTester({ middlewares });
    sagaTester.dispatch(someAction);
    expect(flag).toEqual(true);
  });

  it('Starts the supplied sagas', () => {
    let flag = false;
    const sagas = function*() {
      yield (flag = true);
    };
    const sagaTester = new SagaTester();
    const task = sagaTester.start(sagas);
    expect(typeof task).toBe('object');
    expect(flag).toEqual(true);
  });

  it('Runs the supplied sagas', () => {
    let flag = false;
    const sagas = function*() {
      yield (flag = true);
    };
    const sagaTester = new SagaTester();
    const promise = sagaTester.run(sagas);
    expect(promise).toBeInstanceOf(Function);
    expect(flag).toEqual(true);
  });

  it('Resets the state of the store to the initial state', () => {
    const someFinalValue = 'SOME_FINAL_VALUE';
    const reducers = {
      someKey: (state = someInitialValue, action: { type: string }) =>
        action.type === someActionType ? someFinalValue : state,
    };

    const sagaTester = new SagaTester({
      initialState: someInitialState,
      reducers,
    });
    sagaTester.dispatch(someAction);
    expect(sagaTester.getState()).toStrictEqual({ someKey: someFinalValue });
    expect(sagaTester.getCalledActions()).toStrictEqual([someAction]);

    // After reset, state reverts but action history remains
    sagaTester.reset();
    expect(sagaTester.getState()).toStrictEqual(someInitialState);
    expect(sagaTester.getCalledActions()).toStrictEqual([
      someAction,
      resetAction,
    ]);
  });

  it('Resets the state of the store to the initial state and clears the action list', () => {
    const someFinalValue = 'SOME_FINAL_VALUE';
    const reducers = {
      someKey: (state = someInitialValue, action: { type: string }) =>
        action.type === someActionType ? someFinalValue : state,
    };

    const sagaTester = new SagaTester({
      initialState: someInitialState,
      reducers,
    });
    sagaTester.dispatch(someAction);
    expect(sagaTester.getState()).toStrictEqual({ someKey: someFinalValue });
    expect(sagaTester.getCalledActions()).toStrictEqual([someAction]);

    sagaTester.reset(true);
    expect(sagaTester.getState()).toStrictEqual(someInitialState);
    expect(sagaTester.getCalledActions()).toStrictEqual([]);
  });

  it('Resets the state of the store to the initial state when using a reducer function', () => {
    const someFinalValue = 'SOME_FINAL_VALUE';
    const reducers: Reducer = (
      state = someInitialValue,
      action: { type: string }
    ) => (action.type === someActionType ? someFinalValue : state);

    const sagaTester = new SagaTester({
      initialState: someInitialState,
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      reducers: { someKey: reducers },
    });
    sagaTester.dispatch(someAction);
    expect(sagaTester.getState()).toStrictEqual({ someKey: someFinalValue });
    expect(sagaTester.getCalledActions()).toStrictEqual([someAction]);

    sagaTester.reset(true);
    expect(sagaTester.getState()).toStrictEqual(someInitialState);
    expect(sagaTester.getCalledActions()).toStrictEqual([]);
  });

  it('Returns whether or not an action was called', () => {
    const sagaTester = new SagaTester();
    expect(sagaTester.wasCalled(someActionType)).toEqual(false);
    sagaTester.dispatch(someAction);
  });

  it('Returns whether or not an action was called (including a waitFor clause)', () => {
    const sagaTester = new SagaTester();
    sagaTester.waitFor(someActionType);
    expect(sagaTester.wasCalled(someActionType)).toEqual(false);
    sagaTester.dispatch(someAction);
  });

  it('Counts and returns the number of times an action was called', () => {
    const sagaTester = new SagaTester();
    expect(sagaTester.numCalled(someActionType)).toEqual(0);
    sagaTester.dispatch(someAction);
    expect(sagaTester.numCalled(someActionType)).toEqual(1);
    sagaTester.dispatch(someAction);
    expect(sagaTester.numCalled(someActionType)).toEqual(2);
  });

  it('Returns a promise that will resolve in the future when a specific action is called', done => {
    const sagaTester = new SagaTester();
    sagaTester.waitFor(someActionType).then(() => done());
    sagaTester.dispatch(someAction);
  });

  it('Returns a resolved promise when a specific action was already called', done => {
    const sagaTester = new SagaTester();
    sagaTester.dispatch(someAction);
    sagaTester.waitFor(someActionType).then(() => done());
  });

  it('Returns a promise that will resolve in the future even after an action was called', async () => {
    const sagaTester = new SagaTester();
    sagaTester.dispatch(someAction);
    const promise = sagaTester.waitFor(someActionType, true);
    await expect(
      Promise.race([promise, Promise.resolve('fail')])
    ).resolves.toEqual('fail');
    sagaTester.dispatch(someAction);
    return expect(promise).resolves.toBeUndefined();
  });

  it('Rejects if saga completes without emiting awaited action', () => {
    const sagaTester = new SagaTester();
    const NON_EMITTED_ACTION = 'NON_EMITTED_ACTION';
    const emptySaga = function*() {
      yield;
    };
    sagaTester.run(emptySaga);
    const wait = sagaTester.waitFor(NON_EMITTED_ACTION);

    return expect(wait).rejects.toThrow(Error);
  });

  it('Reject a promise if exception has bubbled to root saga', async () => {
    const reason = 'testcase';
    const sagas = function*() {
      yield;
      throw new Error(reason);
    };
    const sagaTester = new SagaTester();
    sagaTester.run(sagas);

    await expect(sagaTester.waitFor(someActionType)).rejects.toThrow(reason);
  });

  it('Gets the latest called action', () => {
    const sagaTester = new SagaTester();
    sagaTester.dispatch(someAction);
    sagaTester.dispatch(otherAction);

    expect(sagaTester.getLatestCalledAction()).toStrictEqual(otherAction);

    sagaTester.dispatch(anotherAction);

    expect(sagaTester.getLatestCalledAction()).toStrictEqual(anotherAction);
  });

  it('Gets the latest called actions', () => {
    const sagaTester = new SagaTester();
    sagaTester.dispatch(someAction);
    sagaTester.dispatch(otherAction);

    expect(sagaTester.getLatestCalledActions()).toStrictEqual([otherAction]);
    expect(sagaTester.getLatestCalledActions(1)).toStrictEqual([otherAction]);
    expect(sagaTester.getLatestCalledActions(2)).toStrictEqual([
      someAction,
      otherAction,
    ]);
    expect(sagaTester.getLatestCalledActions(3)).toStrictEqual([
      someAction,
      otherAction,
    ]);

    sagaTester.dispatch(anotherAction);

    expect(sagaTester.getLatestCalledActions(3)).toStrictEqual([
      someAction,
      otherAction,
      anotherAction,
    ]);
  });
});
