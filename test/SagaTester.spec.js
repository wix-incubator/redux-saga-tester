import chai, { expect } from 'chai';
import chaiAsPromised   from 'chai-as-promised';

import SagaTester, { resetAction } from '../src/SagaTester';

chai.use(chaiAsPromised);

describe('SagaTester', () => {
	const someInitialValue = 'SOME_INITIAL_VALUE';
	const someInitialState = { someKey : someInitialValue };
	const someActionType   = 'SOME_ACTION_TYPE';
	const OtherActionType  = 'OTHER_ACTION_TYPE';
	const someAction       = { type : someActionType };
	const OtherAction      = { type : OtherActionType };

	it('Populates store with a given initial state', () => {
		const sagaTester = new SagaTester({initialState : someInitialState});
		expect(sagaTester.getState()).to.deep.equal(someInitialState);
	});

	it('Saves a list of actions and returns it in order', () => {
		const sagaTester = new SagaTester({});
		sagaTester.dispatch(someAction);
		sagaTester.dispatch(OtherAction);
		expect(sagaTester.getActionsCalled()).to.deep.equal([
			someAction,
			OtherAction,
		]);
	});

	it('Uses the supplied reducers', () => {
		const someFinalValue = 'SOME_FINAL_VALUE';
		const reducers = {
			someKey : (state = someInitialValue, action) => action.type === someActionType  ? someFinalValue : state
		};

		const sagaTester = new SagaTester({reducers});
		sagaTester.dispatch(someAction);
		expect(sagaTester.getState()).to.deep.equal({someKey : someFinalValue});
	});

  it('uses a reducer as a function if provided', () => {
    let wasReducerCalled = false;
    const reducerFn = () => wasReducerCalled = true;

    const sagaTester = new SagaTester({reducers: reducerFn})
		sagaTester.dispatch(someAction);
		expect(wasReducerCalled).to.be.true;
  })

	it('Uses the supplied middlewares', () => {
		let flag = false;
		const middlewares = [
			store => next => action => { flag = true; return next(action); }
		];
		const sagaTester = new SagaTester({middlewares});
		sagaTester.dispatch(someAction);
		expect(flag).to.equal(true);
	});

	it('Runs the supplied sagas', () => {
		let flag = false;
		const sagas = function*() {
			flag = true;
		}
		const sagaTester = new SagaTester({});
		sagaTester.start(sagas);
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
		expect(sagaTester.getActionsCalled()).to.deep.equal([someAction]);

		// After reset, state reverts but action history remains
		sagaTester.reset();
		expect(sagaTester.getState()).to.deep.equal(someInitialState);
		expect(sagaTester.getActionsCalled()).to.deep.equal([
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
		expect(sagaTester.getActionsCalled()).to.deep.equal([someAction]);

		sagaTester.reset(true);
		expect(sagaTester.getState()).to.deep.equal(someInitialState);
		expect(sagaTester.getActionsCalled()).to.deep.equal([]);
	});

  it('Resets the state of the store to the initial state when using a reducer function', () => {
		const someFinalValue = 'SOME_FINAL_VALUE';
		const reducers = (state = {someKey: someInitialValue}, action) =>
			(action.type === someActionType ? {someKey: someFinalValue} : state)

		const sagaTester = new SagaTester({initialState : someInitialState, reducers});
		sagaTester.dispatch(someAction);
		expect(sagaTester.getState()).to.deep.equal({someKey : someFinalValue});
		expect(sagaTester.getActionsCalled()).to.deep.equal([someAction]);

		sagaTester.reset(true);
		expect(sagaTester.getState()).to.deep.equal(someInitialState);
		expect(sagaTester.getActionsCalled()).to.deep.equal([]);
  });

	it('Returns whether or not an action was called', () => {
		const sagaTester = new SagaTester({});
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
});
