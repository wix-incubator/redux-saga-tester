# redux-saga-tester

Full redux environment testing helper for redux-saga.

[redux-saga](https://github.com/yelouafi/redux-saga/) is a great library that provides an easy way to test your sagas step-by-step, but it's tightly coupled to the saga implementation. Try a non-breaking reorder of the internal `yield`s, and the tests will fail.

This tester library provides a full redux environment to run your sagas in, taking a black-box approach to testing. You can dispatch actions, observe the state of the store at any time, retrieve a history of actions and listen for specific actions to occur.

# Getting Started

## Installation

```
$ npm install --save-dev redux-saga-tester
```

## Basic Example

Suppose we have a saga that waits for a START action, performs some async (or sync) actions (eg. fetching data from an API), and dispatches a `SUCCESS` action upon completion. Here's how we would test it:

```js
import ourSaga from './saga';

describe('ourSaga test', () => {
    let sagaTester = null;

    beforeEach(() => {
        // Init code
        sagaTester = new SagaTester({ initialState });
        sagaTester.start(ourSaga);
    });

    it('should retrieve data from the server and send a SUCCESS action', async () => {
        // Our test (Actions is our standard redux action component). Start the saga with the START action
        sagaTester.dispatch(Actions.actions.start());

        // Wait for the saga to finish (it emits the SUCCESS action when its done)
        const successAction = await sagaTester.waitFor(Actions.types.SUCCESS);

        // Check that the success action is what we expect it to be
        expect(successAction).to.deep.equal(
            Actions.actions.success({ data: expectedData })
        );
    });
});
```

This is of course an example of testing a saga that contains async actions. Generally when testing it is perferred to use sync mocks. In that case, there's no need to async/await.

## Full example

Can be found under the `examples` directory.

```js
import chaiAsPromised from 'chai-as-promised';
import { call, take, put } from 'redux-saga/effects';
import SagaTester from 'redux-saga-tester';

chai.use(chaiAsPromised);

const someValue = 'SOME_VALUE';
const someResult = 'SOME_RESULT';
const someOtherValue = 'SOME_OTHER_VALUE';
const middlewareMeta = 'MIDDLEWARE_TEST';
const fetchRequestActionType = 'FETCH_REQUEST'
const fetchSuccessActionType = 'FETCH_SUCCESS'

const initialState = { someKey : someValue };
const reducer = (state = someValue, action) =>
    action.type === fetchSuccessActionType ? someOtherValue : state;
const middleware = store => next => action => next({
    ...action,
    meta : middlewareMeta
});
// options are passed to createSagaMiddleware
const options = { onError => console.error.bind(console) }
const fetchApi = () => someResult;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function* listenAndFetch() {
    yield take(fetchRequestActionType);
    const result = yield call(fetchApi);
    yield call(delay, 500); // For async example.
    yield put({ type : fetchSuccessActionType, payload : result });
}

it('Showcases the tester API', async () => {
    // Start up the saga tester
    const sagaTester = new SagaTester({
        initialState,
        reducers : { someKey : reducer },
        middlewares : [middleware],
        options,
    });
    sagaTester.start(listenAndFetch);

    // Check that state was populated with initialState
    expect(sagaTester.getState()).to.deep.equal(initialState);

    // Dispatch the event to start the saga
    sagaTester.dispatch({type : fetchRequestActionType});

    // Hook into the success action
    await sagaTester.waitFor(fetchSuccessActionType);

    // Check that all actions have the meta property from the middleware
    sagaTester.getCalledActions().forEach(action => {
        expect(action.meta).to.equal(middlewareMeta)
    });

    // Check that the new state was affected by the reducer
    expect(sagaTester.getState()).to.deep.equal({
        someKey : someOtherValue
    });

    // Check that the saga listens only once
    sagaTester.dispatch({ type : fetchRequestActionType });
    expect(sagaTester.numCalled(fetchRequestActionType)).to.equal(2);
    expect(sagaTester.numCalled(fetchSuccessActionType)).to.equal(1);

    // Reset the state and action list, dispatch again
    // and check that it was called
    sagaTester.reset(true);
    expect(sagaTester.wasCalled(fetchRequestActionType)).to.equal(false);
    sagaTester.dispatch({ type : fetchRequestActionType });
    expect(sagaTester.wasCalled(fetchRequestActionType)).to.equal(true);
})
```

## API

#### `new SagaTester(options) => sagaTester`

Create a new SagaTester instance.

1. `options: Object`
   * `initialState : Object`
   * `reducers : Object | Function`
   * `middlewares : Array[Function]`
   * `combineReducers : Function`
   * `ignoreReduxActions : Boolean`
   * `options : Object`
     * Options for `createSagaMiddleware` (see [docs](https://github.com/redux-saga/redux-saga/tree/master/docs/api#createsagamiddlewareoptions)).

#### `sagaTester.start(saga, [...args])`
Starts execution of the provided saga.

1. `saga : Function`
    * The saga generator function to start
2. `[...args] : Any`
    * *Optional* Arguments to pass to the generator on start

#### `sagaTester.dispatch(action)`

Dispatches an action to the redux store.

#### `sagaTester.updateState(newState)`

Assigns the `newState` into the current state.
_(Only works with the default reducer.)_

#### `sagaTester.getState() => Object`

Returns the state of the redux store.

#### `sagaTester.waitFor(actionType, futureOnly) => Promise<action>`

Returns a promise that will resolve if the specified action is dispatched to the store.

1. `actionType : String`
2. `futureOnly : Boolean`
   * Causes waitFor to only resolve if the action is called in the future.

The promise resolves with the matching `action` object.

#### `sagaTester.wasCalled(actionType) => Boolean`

Returns whether the specified was dispatched in the past.

#### `sagaTester.numCalled(actionType) => Number`

Returns the number of times an action with the given type was dispatched.

#### `sagaTester.getLatestCalledAction() => Action`

Returns the last action dispatched to the store.

#### `sagaTester.getCalledActions() => Array[Actions]`

Returns an array of all actions dispatched.

#### `sagaTester.reset(clearActionList)`

Reset the store state back to `initialState`.

1. `clearActionList : Boolean`
   * Clears the history of past actions (defaults to `false`).
