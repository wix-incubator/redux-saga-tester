import createSagaMiddleware from 'redux-saga';
import { combineReducers, createStore, applyMiddleware } from 'redux';

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
    constructor({initialState = {}, reducers, middlewares = []}) {
        this.actionsCalled  = [];
        this.actionLookups  = {};
        this.sagaMiddleware = createSagaMiddleware();

        // Wrap reducers so they can be reset, or supply identity reducer as default
        const finalReducer = reducers
            ? combineReducers(Object.keys(reducers).reduce((rc, reducerName) => ({
                    ...rc,
                    [reducerName] : makeResettable(reducers[reducerName], initialState[reducerName])
                }), {}))
            : state => state;

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
            testerMiddleware,
            ...middlewares,
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

    start(sagas = []) {
        this.sagaMiddleware.run(sagas);
    }

    reset(clearActionList = false) {
        this.store.dispatch(resetAction);
        if (clearActionList) {
            // Clear existing array in case there are other references to it
            this.actionsCalled.length = 0;
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
