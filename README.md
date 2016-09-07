# redux-saga-tester
Full redux environment testing helper for redux-saga.

[redux-saga](https://github.com/yelouafi/redux-saga/) is a great library that provides an easy way to test your sagas step-by-step, but it's tightly coupled to the saga implementation. Try a non-breaking reorder of the internal `yield`s, and the tests will fail.

This tester library provides a full redux environment to run your sagas in, taking a black-box approach to testing. You can dispatch actions, observe the state of the store at any time, retrieve a history of actions, and listen for specific actions to occur.

# Getting Started

## Installation

```
$ npm install --save-dev redux-saga-tester
```

## Basic Example

Suppose we have a saga that performs a REST call, dispatching a `FETCH_SUCCESS` action upon completion. One way to test this is to check the list of actions on completion:
```js
import fetchSaga from './saga';
it('saves actions emitted from the saga', () => {
    const sagaTester = new SagaTester({});
    sagaTester.start(fetchSaga); // calls sagaMiddleware.run(fetchSaga)
    const actionList = sagaTester.getActionsCalled();
    expect(actionList).to.deep.equal([{type : 'FETCH_SUCCESS'}]);
})
```

Another way is to listen specifically for the `FETCH_SUCCESS` action:
```js
import fetchSaga from './saga';
it('listens to a specific action', done => {
    const sagaTester = new SagaTester({});
    sagaTester.waitFor('FETCH_SUCCESS').then(() => done());
    sagaTester.start(fetchSaga);
})
```

## Full example

Can be found under the `examples` directory.

```js
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { call, take, put } from 'redux-saga/effects';
import SagaTester, { resetAction } from '../';

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

const fetchApi = () => someResult;

function* listenAndFetch() {
    yield take(fetchRequestActionType);
    const result = yield call(fetchApi);
    yield put({ type : fetchSuccessActionType, payload : result });
}

it('Showcases the tester API', done => {
    // Start up the saga tester
    const sagaTester = new SagaTester({
        initialState,
        reducers : { someKey : reducer },
        middlewares : [middleware]
    });
    sagaTester.start(listenAndFetch);

    // Check that state was populated with initialState
    expect(sagaTester.getState()).to.deep.equal(initialState);

    // Hook into the success action
    sagaTester.waitFor(fetchSuccessActionType).then(() => {
        // Check that all actions have the meta property from the middleware
        sagaTester.getActionsCalled().forEach(action => {
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

        done();
    });

    // Dispatch the event to start the saga
    sagaTester.dispatch({type : fetchRequestActionType});
})
```