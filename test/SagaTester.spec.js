import chai, { expect } from 'chai';
import chaiAsPromised   from 'chai-as-promised';
import { fromJS } from 'immutable';

import SagaTester, { resetAction } from '../src/SagaTester';

chai.use(chaiAsPromised);

describe('SagaTester', () => {
    const someInitialValue  = 'SOME_INITIAL_VALUE';
    const someInitialState  = { someKey : someInitialValue };
    const someActionType    = 'SOME_ACTION_TYPE';
    const otherActionType   = 'OTHER_ACTION_TYPE';
    const anotherActionType = 'ANOTHER_ACTION_TYPE';
    const reduxActionType   = '@@redux/ACTION_TYPE';
    const someAction        = { type : someActionType };
    const otherAction       = { type : otherActionType };
    const anotherAction     = { type : anotherActionType };
    const reduxAction       = { type : reduxActionType };

    it('Passes options to createSagaMiddleware', () => {
        // kind of backwards - we can't introspect the sagatester to see if our
        // options were passed in but we can observe its behavior, and passing in
        // a non-function for a channel (or logger, in redux-saga <1.0.0) is something
        // that redux-saga explicitly tests for (and throws an error on). so we can
        // verify that doing the same thing here also throws an error, and thus our
        // config is being passed on.
        const sagaTester = () => new SagaTester({ options: { channel: 42, logger: 42 }});
        expect(sagaTester).to.throw(
            /(\`options\.logger\`|options\.channel) passed to the Saga middleware is not a (function|channel)/,
        );
    });

    it('Populates store with a given initial state', () => {
        const sagaTester = new SagaTester({initialState : someInitialState});
        expect(sagaTester.getState()).to.deep.equal(someInitialState);
    });

    it('Saves a list of actions and returns it in order', () => {
        const sagaTester = new SagaTester({});
        sagaTester.dispatch(someAction);
        sagaTester.dispatch(otherAction);
        expect(sagaTester.getCalledActions()).to.deep.equal([
            someAction,
            otherAction,
        ]);
    });

    it('Ignores redux action types by default', () => {
        const sagaTester = new SagaTester({});
        sagaTester.dispatch(reduxAction);
        expect(sagaTester.getCalledActions()).to.deep.equal([]);
    });

    it('Captures redux action types if configured', () => {
        const sagaTester = new SagaTester({ignoreReduxActions: false});
        sagaTester.dispatch(reduxAction);
        expect(sagaTester.getCalledActions()).to.deep.equal([
            reduxAction,
        ]);
    });

    it('Uses the supplied reducers', () => {
        const someFinalValue = 'SOME_FINAL_VALUE';
        const reducers = {
            someKey : (state = someInitialValue, action) => action.type === someActionType  ? someFinalValue : state,
            someOtherKey : () => 1234
        };

        const sagaTester = new SagaTester({reducers});
        sagaTester.dispatch(someAction);
        expect(sagaTester.getState()).to.deep.equal({someKey : someFinalValue, someOtherKey: 1234});
    });

    it('Uses a reducer as a function if provided', () => {
        let wasReducerCalled = false;
        const reducerFn = () => wasReducerCalled = true;

        const sagaTester = new SagaTester({reducers: reducerFn});
        sagaTester.dispatch(someAction);
        expect(wasReducerCalled).to.be.true;
    });

    it('Uses the supplied middlewares', () => {
        let flag = false;
        const middlewares = [
            () => next => action => { flag = true; return next(action); }
        ];
        const sagaTester = new SagaTester({middlewares});
        sagaTester.dispatch(someAction);
        expect(flag).to.equal(true);
    });

    it('Starts the supplied sagas', () => {
        let flag = false;
        const sagas = function*() {
            yield flag = true;
        };
        const sagaTester = new SagaTester({});
        const task = sagaTester.start(sagas);
        expect(task).to.be.an('object');
        expect(flag).to.equal(true);
    });

    it('Runs the supplied sagas', () => {
        let flag = false;
        const sagas = function*() {
            yield flag = true;
        };
        const sagaTester = new SagaTester({});
        const promise = sagaTester.run(sagas);
        expect(promise).to.be.a('promise');
        expect(flag).to.equal(true);
    });

    it('Resets the state of the store to the initial state', () => {
        const someFinalValue = 'SOME_FINAL_VALUE';
        const reducers = {
            someKey : (state = someInitialValue, action) => action.type === someActionType  ? someFinalValue : state
        };

        const sagaTester = new SagaTester({initialState : someInitialState, reducers});
        sagaTester.dispatch(someAction);
        expect(sagaTester.getState()).to.deep.equal({someKey : someFinalValue});
        expect(sagaTester.getCalledActions()).to.deep.equal([someAction]);

		// After reset, state reverts but action history remains
        sagaTester.reset();
        expect(sagaTester.getState()).to.deep.equal(someInitialState);
        expect(sagaTester.getCalledActions()).to.deep.equal([
            someAction,
            resetAction
        ]);
    });

    it('Resets the state of the store to the initial state and clears the action list', () => {
        const someFinalValue = 'SOME_FINAL_VALUE';
        const reducers = {
            someKey : (state = someInitialValue, action) => action.type === someActionType  ? someFinalValue : state
        };

        const sagaTester = new SagaTester({initialState : someInitialState, reducers});
        sagaTester.dispatch(someAction);
        expect(sagaTester.getState()).to.deep.equal({someKey : someFinalValue});
        expect(sagaTester.getCalledActions()).to.deep.equal([someAction]);

        sagaTester.reset(true);
        expect(sagaTester.getState()).to.deep.equal(someInitialState);
        expect(sagaTester.getCalledActions()).to.deep.equal([]);
    });

    it('Resets the state of the store to the initial state when using a reducer function', () => {
        const someFinalValue = 'SOME_FINAL_VALUE';
        const reducers = (state = {someKey: someInitialValue}, action) =>
			(action.type === someActionType ? {someKey: someFinalValue} : state);

        const sagaTester = new SagaTester({initialState : someInitialState, reducers});
        sagaTester.dispatch(someAction);
        expect(sagaTester.getState()).to.deep.equal({someKey : someFinalValue});
        expect(sagaTester.getCalledActions()).to.deep.equal([someAction]);

        sagaTester.reset(true);
        expect(sagaTester.getState()).to.deep.equal(someInitialState);
        expect(sagaTester.getCalledActions()).to.deep.equal([]);
    });

    it('Returns whether or not an action was called', () => {
        const sagaTester = new SagaTester({});
        expect(sagaTester.wasCalled(someActionType)).to.equal(false);
        sagaTester.dispatch(someAction);
    });

    it('Returns whether or not an action was called (including a waitFor clause)', () => {
        const sagaTester = new SagaTester({});
        sagaTester.waitFor(someActionType);
        expect(sagaTester.wasCalled(someActionType)).to.equal(false);
        sagaTester.dispatch(someAction);
    });

    it('Counts and returns the number of times an action was called', () => {
        const sagaTester = new SagaTester({});
        expect(sagaTester.numCalled(someActionType)).to.equal(0);
        sagaTester.dispatch(someAction);
        expect(sagaTester.numCalled(someActionType)).to.equal(1);
        sagaTester.dispatch(someAction);
        expect(sagaTester.numCalled(someActionType)).to.equal(2);
    });

    it('Returns a promise that will resolve in the future when a specific action is called', done => {
        const sagaTester = new SagaTester({});
        sagaTester.waitFor(someActionType).then(() => done());
        sagaTester.dispatch(someAction);
    });

    it('Returns a resolved promise when a specific action was already called', done => {
        const sagaTester = new SagaTester({});
        sagaTester.dispatch(someAction);
        sagaTester.waitFor(someActionType).then(() => done());
    });

    it('Returns a promise that will resolve in the future even after an action was called', () => {
        const sagaTester = new SagaTester({});
        sagaTester.dispatch(someAction);
        const promise = sagaTester.waitFor(someActionType, true);
        return expect(Promise.race([promise, Promise.resolve('fail')])).to.eventually.equal('fail').then(() => {
            sagaTester.dispatch(someAction);
            return expect(promise).to.be.fulfilled;
        });
    });

    it('Rejects if saga completes without emiting awaited action', () => {
        const sagaTester = new SagaTester({});
        const NON_EMITTED_ACTION = 'NON_EMITTED_ACTION';
        const emptySaga = function*() {
            yield;
        };
        sagaTester.run(emptySaga);
        const wait = sagaTester.waitFor(NON_EMITTED_ACTION);

        return expect(wait).to.be.rejectedWith(Error, NON_EMITTED_ACTION);
    });

    it('Reject a promise if exception has bubbled to root saga', () => {
        const reason = 'testcase';
        const sagas = function*() {
            yield;
            throw new Error(reason);
        };
        const sagaTester = new SagaTester({});
        sagaTester.run(sagas);

        const promise = sagaTester.waitFor(someActionType);
        return expect(promise).to.be.rejectedWith(Error, reason);
    });

    it('Gets the latest called action', () => {
        const sagaTester = new SagaTester({});
        sagaTester.dispatch(someAction);
        sagaTester.dispatch(otherAction);

        expect(sagaTester.getLatestCalledAction()).to.deep.equal(otherAction);

        sagaTester.dispatch(anotherAction);

        expect(sagaTester.getLatestCalledAction()).to.deep.equal(anotherAction);
    });

    it('Gets the latest called actions', () => {
        const sagaTester = new SagaTester({});
        sagaTester.dispatch(someAction);
        sagaTester.dispatch(otherAction);

        expect(sagaTester.getLatestCalledActions()).to.deep.equal([otherAction]);
        expect(sagaTester.getLatestCalledActions(1)).to.deep.equal([otherAction]);
        expect(sagaTester.getLatestCalledActions(2)).to.deep.equal([
            someAction, otherAction
        ]);
        expect(sagaTester.getLatestCalledActions(3)).to.deep.equal([
            someAction, otherAction
        ]);

        sagaTester.dispatch(anotherAction);

        expect(sagaTester.getLatestCalledActions(3)).to.deep.equal([
            someAction, otherAction, anotherAction
        ]);
    });

    it('Sets the state of the store - works similar to react\'s setState - no reducer', () => {
        const someInitialState = {foo: 'bar', nestedFoo: {bo: 'jack'}};

        let sagaTester = new SagaTester({initialState: someInitialState});
        sagaTester.setState({foo: 5});
        let newState = sagaTester.getState();
        expect(newState.foo).to.equal(5);
        expect(newState.nestedFoo).to.deep.equal(someInitialState.nestedFoo);
        expect(sagaTester.getCalledActions().length).to.equal(1);  // this was a mistake, but leaving this for backward compatibility

        sagaTester = new SagaTester({initialState: someInitialState});
        sagaTester.setState({nestedFoo: {bo: 'horseman'}});
        newState = sagaTester.getState();
        expect(newState.foo).to.equal('bar');
        expect(newState.nestedFoo).to.deep.equal({bo: 'horseman'});
        expect(sagaTester.getCalledActions().length).to.equal(1);  // this was a mistake, but leaving this for backward compatibility
    });

    it('Sets the state of the store - works similar to react\'s setState - with reducer', () => {
        const someInitialState = {foo: 'bar', nestedFoo: {bo: 'jack'}};
        const someReducer = (state = someInitialState) => state;

        let sagaTester = new SagaTester({reducers: {someReducer}});
        sagaTester.setState({someReducer: {foo: 5}});
        let newState = sagaTester.getState();
        expect(newState.someReducer.foo).to.equal(5);
        expect(newState.someReducer.nestedFoo).to.deep.equal(someInitialState.nestedFoo);
        expect(sagaTester.getCalledActions().length).to.equal(1);  // this was a mistake, but leaving this for backward compatibility

        sagaTester = new SagaTester({reducers: {someReducer}});
        sagaTester.setState({someReducer: {nestedFoo: {bo: 'horseman'}}});
        newState = sagaTester.getState();
        expect(newState.someReducer.foo).to.equal('bar');
        expect(newState.someReducer.nestedFoo).to.deep.equal({bo: 'horseman'});
        expect(sagaTester.getCalledActions().length).to.equal(1); // this was a mistake, but leaving this for backward compatibility
    });

    it('Updates the state of the store - newer version of setState (no counting) - no reducer', () => {
        const someInitialState = {foo: 'bar', nestedFoo: {bo: 'jack'}};

        let sagaTester = new SagaTester({initialState: someInitialState});
        sagaTester.updateState({foo: 5});
        let newState = sagaTester.getState();
        expect(newState.foo).to.equal(5);
        expect(newState.nestedFoo).to.deep.equal(someInitialState.nestedFoo);
        expect(sagaTester.getCalledActions().length).to.equal(0);

        sagaTester = new SagaTester({initialState: someInitialState});
        sagaTester.updateState({nestedFoo: {bo: 'horseman'}});
        newState = sagaTester.getState();
        expect(newState.foo).to.equal('bar');
        expect(newState.nestedFoo).to.deep.equal({bo: 'horseman'});
        expect(sagaTester.getCalledActions().length).to.equal(0);
    });

    it('Updates the state of the store - newer version of setState (no counting) - with reducer', () => {
        const someInitialState = {foo: 'bar', nestedFoo: {bo: 'jack'}};
        const someReducer = (state = someInitialState) => state;

        let sagaTester = new SagaTester({reducers: {someReducer}});
        sagaTester.updateState({someReducer: {foo: 5}});
        let newState = sagaTester.getState();
        expect(newState.someReducer.foo).to.equal(5);
        expect(newState.someReducer.nestedFoo).to.deep.equal(someInitialState.nestedFoo);
        expect(sagaTester.getCalledActions().length).to.equal(0);

        sagaTester = new SagaTester({reducers: {someReducer}});
        sagaTester.updateState({someReducer: {nestedFoo: {bo: 'horseman'}}});
        newState = sagaTester.getState();
        expect(newState.someReducer.foo).to.equal('bar');
        expect(newState.someReducer.nestedFoo).to.deep.equal({bo: 'horseman'});
        expect(sagaTester.getCalledActions().length).to.equal(0);
    });

    it('Handles immutable data structures with the default reducer', () => {
        const initialState = fromJS({ foo: 'initial' });
        const expectedState = { foo: 'bar' };

        const sagaTester = new SagaTester({ initialState });
        sagaTester.updateState(expectedState);
        const newState = sagaTester.getState();

        expect(newState.toJS).to.be.a('function');
        expect(newState.toJS()).to.deep.equal(expectedState);
    });
});
