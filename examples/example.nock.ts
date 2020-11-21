import { expect } from 'chai';
import { call, put } from 'redux-saga/effects';
import SagaTester from '../src/SagaTester.js';
import { takeLatest } from 'redux-saga';
import fetch from 'node-fetch';
import nock from 'nock';

const fetchReply = { value: 'SOME_VALUE' };
const fetchRequestActionType = 'FETCH_REQUEST';
const fetchSuccessActionType = 'FETCH_SUCCESS';

function* handleFetch() {
  const respond = yield call(() => fetch('http://example.com/v0.1'));
  const result = yield call(() => respond.json());
  yield put({ type: fetchSuccessActionType, payload: result });
}

function* mySaga() {
  // will cancel current running handleFetch task
  yield takeLatest(fetchRequestActionType, handleFetch);
}

describe('example.nock.js', () => {
  it('showcases using saga tester with a saga that fetches data and returns a resulting action', async () => {
    // Setup Nock
    nock('http://example.com')
      .get('/v0.1')
      .reply(200, fetchReply);

    // Start up the saga tester
    const sagaTester = new SagaTester();

    sagaTester.start(mySaga);

    // Dispatch the event to start the saga
    sagaTester.dispatch({ type: fetchRequestActionType });

    // Hook into the success action
    await sagaTester.waitFor(fetchSuccessActionType);

    // Check the resulting action
    expect(sagaTester.getLatestCalledAction()).to.deep.equal({
      type: fetchSuccessActionType,
      payload: fetchReply,
    });
  });
});
