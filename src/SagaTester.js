import createSagaMiddleware from 'redux-saga';
import { combineReducers as reduxCombineReducers, createStore, applyMiddleware } from 'redux';

const RESET_TESTER_ACTION_TYPE = '@@RESET_TESTER';
const makeResettable = (reducer, initialStateSlice) => (state, action) => {
    switch (action.type) {
        case RESET_TESTER_ACTION_TYPE:
            return reducer(initialStateSlice, action);
        default:
            return reducer(state, action);
    }
};
export const resetAction = { type : RESET_TESTER_ACTION_TYPE };

export default class SagaIntegrationTester {
    constructor({initialState = {}, reducers, middlewares = [], combineReducers = reduxCombineReducers}) {
        this.actionsCalled  = [];
        this.actionLookups  = {};
        this.sagaMiddleware = createSagaMiddleware();

        const finalReducer = (() => {
          // supply identity reducer as default
          if (!reducers) return state => state;
          // use reducer function if already provided
          if (typeof reducers === 'function') return reducers;
          // .. or, wrap reducers so they can be reset
          return combineReducers(Object.keys(reducers).reduce((rc, reducerName) => ({
              ...rc,
              [reducerName] : makeResettable(reducers[reducerName], initialState[reducerName])
          }), {}));
        })();

        // Middleware to store the actions and create promises
        const testerMiddleware = store => next => action => {
            // Don't monitor redux actions
            if (!action.type.startsWith('@@redux')) {
                this.actionsCalled.push(action);
                const actionObj = this._addAction(action.type);
                actionObj.count++;
                actionObj.callback(action);
            }
            return next(action);
        }

        const allMiddlewares = [
            ...middlewares,
            testerMiddleware,
            this.sagaMiddleware,
        ];
        this.store = createStore(
            finalReducer,
            initialState,
            applyMiddleware(...allMiddlewares)
        );
    }

    _addAction(actionType, futureOnly = false) {
        let action = this.actionLookups[actionType];
        if (!action || futureOnly) {
            action = { count : 0 };
            action.promise = new Promise((resolve, reject) => action.callback = resolve);
            this.actionLookups[actionType] = action;
        }
        return action;
    }

    start(sagas = [], ...args) {
        this.sagaMiddleware.run(sagas, ...args);
    }

    reset(clearActionList = false) {
        this.store.dispatch(resetAction);
        if (clearActionList) {
            // Clear existing array in case there are other references to it
            this.actionsCalled.length = 0;
            // Delete object keys in case there are other references to it
            Object.keys(this.actionLookups).forEach(key => delete this.actionLookups[key]);
        }
    }

    dispatch(action) {
        this.store.dispatch(action);
    }

    getState() {
        return this.store.getState();
    }

    getActionsCalled() {
        return this.actionsCalled;
    }

    getLastActionCalled(num = 1) {
        return this.actionsCalled.slice(-1 * num);
    }

    wasCalled(actionType) {
        return !!this.actionLookups[actionType];
    }

    numCalled(actionType) {
        const action = this.actionLookups[actionType];
        return action && action.count || 0;
    }

    waitFor(actionType, futureOnly = false) {
        return this._addAction(actionType, futureOnly).promise;
    }
}
