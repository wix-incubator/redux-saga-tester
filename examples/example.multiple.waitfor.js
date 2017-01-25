import { expect } from 'chai';
import { call, put } from 'redux-saga/effects';
import SagaTester from '../src/SagaTester.js';
import { takeLatest } from 'redux-saga';
import fetch from 'node-fetch';
import nock from 'nock';

const fetchReply = {value: 'SOME_VALUE'};
const fetchRequestActionType = 'FETCH_REQUEST';
const fetchSuccessActionType = 'FETCH_SUCCESS';
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function* handleFetchSync() {
    const respond = yield call(() => fetch('http://example.com/v0.1'));
    const result = yield call(() => respond.json());
    yield put({ type : fetchSuccessActionType, payload : {result, index:0} });
    yield put({ type : fetchSuccessActionType, payload : {result, index:1} });
    yield put({ type : fetchSuccessActionType, payload : {result, index:2} });
}

function* mySagaSync() {
    // will cancel current running handleFetchSync task
    yield takeLatest(fetchRequestActionType, handleFetchSync);
}

function* handleFetchAsync() {
    const respond = yield call(() => fetch('http://example.com/v0.1'));
    const result = yield call(() => respond.json());
    yield put({ type : fetchSuccessActionType, payload : {result, index:0} });
    yield call(delay, 500);
    yield put({ type : fetchSuccessActionType, payload : {result, index:1} });
    yield call(delay, 500);
    yield put({ type : fetchSuccessActionType, payload : {result, index:2} });
}

function* mySagaAsync() {
    // will cancel current running handleFetchAsync task
    yield takeLatest(fetchRequestActionType, handleFetchAsync);
}

describe('example.multiple.waitfor.js', () => {

    it('showcases using saga tester with waiting for multiple waitFors for the same action - sync', async () => {

        // Setup Nock
        nock('http://example.com')
            .get('/v0.1')
            .reply(200, fetchReply);

        // Start up the saga tester
        const sagaTester = new SagaTester({});

        sagaTester.start(mySagaSync);

        // Dispatch the event to start the saga
        sagaTester.dispatch({type : fetchRequestActionType});

        // Hook into the success action
        await sagaTester.waitFor(fetchSuccessActionType);

        // Check the resulting actions
        expect(sagaTester.getLatestCalledActions(3)).to.deep.equal([{
            type: fetchSuccessActionType,
            payload: {result:fetchReply, index:0}
        }, {
            type: fetchSuccessActionType,
            payload: {result:fetchReply, index:1}
        }, {
            type: fetchSuccessActionType,
            payload: {result:fetchReply, index:2}
        }
        ]);
    });

    it('showcases using saga tester with waiting for multiple waitFors for the same action - async', async () => {

        // Setup Nock
        nock('http://example.com')
            .get('/v0.1')
            .reply(200, fetchReply);

        // Start up the saga tester
        const sagaTester = new SagaTester({});

        sagaTester.start(mySagaAsync);

        // Dispatch the event to start the saga
        sagaTester.dispatch({type : fetchRequestActionType});

        // Hook into the success action
        await sagaTester.waitFor(fetchSuccessActionType);

        // Check the resulting action
        expect(sagaTester.getLatestCalledAction()).to.deep.equal({
            type: fetchSuccessActionType,
            payload: {result:fetchReply, index:0}
        });

        // Hook into the success action
        await sagaTester.waitFor(fetchSuccessActionType, true);

        // Check the resulting action
        expect(sagaTester.getLatestCalledAction()).to.deep.equal({
            type: fetchSuccessActionType,
            payload: {result:fetchReply, index:1}
        });

        // Hook into the success action
        await sagaTester.waitFor(fetchSuccessActionType, true);

        // Check the resulting action
        expect(sagaTester.getLatestCalledAction()).to.deep.equal({
            type: fetchSuccessActionType,
            payload: {result:fetchReply, index:2}
        });
    });
});
