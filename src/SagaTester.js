import createSagaMiddleware from 'redux-saga';
import { combineReducers as reduxCombineReducers, createStore, applyMiddleware } from 'redux';

const RESET_TESTER_ACTION_TYPE = '@@RESET_TESTER';

export const resetAction = { type : RESET_TESTER_ACTION_TYPE };

export default class SagaIntegrationTester {
    constructor({
        initialState = {},
        reducers,
        middlewares = [],
        combineReducers = reduxCombineReducers,
        ignoreReduxActions = true,
        options = {},
    }) {
        this.calledActions  = [];
        this.actionLookups  = {};
        this.sagaMiddleware = createSagaMiddleware(options);

        const reducerFn = typeof reducers === 'object' ? combineReducers(reducers) : reducers;

        const finalReducer = (state, action) => {
          // reset state if requested
            if (action.type === RESET_TESTER_ACTION_TYPE) return initialState;

          // supply identity reducer as default
            if (!reducerFn) return initialState;

          // otherwise use the provided reducer
            return reducerFn(state, action);
        };

        // Middleware to store the actions and create promises
        const testerMiddleware = () => next => action => {
            if (ignoreReduxActions && action.type.startsWith('@@redux')) {
                // Don't monitor redux actions
            } else {
                this.calledActions.push(action);
                const actionObj = this._addAction(action.type);
                actionObj.count++;
                actionObj.callback(action);
            }
            return next(action);
        };

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
            action.promise = new Promise((resolve) => action.callback = resolve);
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
            this.calledActions.length = 0;
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

    getCalledActions() {
        return this.calledActions;
    }

    getLatestCalledAction() {
        return this.calledActions[this.calledActions.length - 1];
    }

    getLatestCalledActions(num = 1) {
        return this.calledActions.slice(-1 * num);
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

    getActionsCalled() {
        console.warn('[redux-saga-tester] Warning: getActionsCalled has been deprecated. Please use getCalledActions.');
        return this.calledActions;
    }

    getLastActionCalled(num = 1) {
        console.warn('[redux-saga-tester] Warning: getLastActionCalled has been deprecated. Please use getLatestCalledAction or getLatestCalledActions.');
        return this.calledActions.slice(-1 * num);
    }
}
