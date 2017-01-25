import { expect } from 'chai';
import { call, put } from 'redux-saga/effects';
import SagaTester from '../src/SagaTester.js';
import { takeLatest } from 'redux-saga';

const someValue = 'SOME_VALUE';
const someResult = 'SOME_RESULT';
const someOtherValue = 'SOME_OTHER_VALUE';
const middlewareMeta = 'MIDDLEWARE_TEST';
const fetchRequestActionType = 'FETCH_REQUEST';
const fetchSuccessActionType = 'FETCH_SUCCESS';

const initialState = { someKey : someValue };
const reducer = (state = someValue, action) =>
    action.type === fetchSuccessActionType ? someOtherValue : state;
const middleware = () => next => action => next({
    ...action,
    meta : middlewareMeta
});

const fetchApi = () => someResult;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function* handleInput() {
    // debounce by 500ms
    yield call(delay, 500);
    const result = yield call(fetchApi);
    yield put({ type : fetchSuccessActionType, payload : result });
}

function* watchInput() {
    // will cancel current running handleInput task
    yield takeLatest(fetchRequestActionType, handleInput);
}

describe('example.debounce.js', () => {
    it('Showcases the tester API with async await', async () => {
        // Start up the saga tester
        const sagaTester = new SagaTester({
            initialState,
            reducers : { someKey : reducer },
            middlewares : [middleware]
        });
        sagaTester.start(watchInput);

        // Check that state was populated with initialState
        expect(sagaTester.getState()).to.deep.equal(initialState);

        // Dispatch the event to start the saga
        sagaTester.dispatch({type : fetchRequestActionType});

        // Hook into the success action
        await sagaTester.waitFor(fetchSuccessActionType);

        // Check that all actions have the meta property from the middleware
        sagaTester.getCalledActions().forEach(action => {
            expect(action.meta).to.equal(middlewareMeta);
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
    });
});
