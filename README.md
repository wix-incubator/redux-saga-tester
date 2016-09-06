# redux-saga-tester
Full redux environment testing helper for redux-saga

[redux-saga](https://github.com/yelouafi/redux-saga/) is a great library that provides an easy way to test your sagas step-by-step, but it's tightly coupled to the saga implementation. Try a non-breaking reorder of the internal `yield`s, and the tests will fail.

This tester library provides a full redux environment to run your sagas in, taking a black-box approach to testing. You can dispatch actions, observe the state of the store at any time, retrieve a history of actions, and listen for specific actions to occur.

# Getting Started

## Installation

```
$ npm install --save-dev redux-saga-tester
```

## Usage Example

Suppose we have a saga that performs a REST call, dispatching a `FETCH_SUCCESS` action upon completion. One way to test this is to check the list of actions on completion:
```js
import fetchSaga from './saga';
it('saves actions emitted from the saga', () => {
    const sagaTester = new SagaTester({});
    sagaTester.start(fetchSaga);           // calls sagaMiddleware.run(fetchSaga)
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