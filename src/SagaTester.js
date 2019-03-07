import createSagaMiddleware from 'redux-saga';
import { combineReducers as reduxCombineReducers, createStore, applyMiddleware } from 'redux';

const RESET_TESTER_ACTION_TYPE = '@@RESET_TESTER';
const SET_STATE_TYPE = '@@SET_TESTER_STATE';
const UPDATE_STATE_TYPE = '@@UPDATE_TESTER_STATE';

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

        const reducerFn = typeof reducers === 'object' ? combineReducers(wrapReducers(reducers)) : reducers;

        const finalReducer = (state, action) => {
          // reset state if requested
            if (action.type === RESET_TESTER_ACTION_TYPE) return initialState;

          // supply identity reducer as default
            if (!reducerFn) {
                let stateUpdate = {};

                if ([SET_STATE_TYPE, UPDATE_STATE_TYPE].indexOf(action.type) > -1) {
                    stateUpdate = action.payload;
                }

                // TODO: update this to use `.isImmutable()` as soon as v4 is released.
                // http://facebook.github.io/immutable-js/docs/#/isImmutable
                if (initialState.toJS) {
                    return initialState.mergeDeep(stateUpdate);
                }

                return Object.assign({}, initialState, stateUpdate);
            }

          // otherwise use the provided reducer
            return reducerFn(state, action);
        };

        // Middleware to store the actions and create promises
        const testerMiddleware = () => next => action => {
            if (ignoreReduxActions && action.type.startsWith('@@redux/') || action.type === UPDATE_STATE_TYPE) {
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

    _handleRootSagaException(e) {
        Object.keys(this.actionLookups).forEach(key => this.actionLookups[key].reject(e));
    }

    _addAction(actionType, futureOnly = false) {
        let action = this.actionLookups[actionType];

        if (!action || futureOnly) {
            action = { count : 0 };
            action.promise = new Promise(function(resolve, reject){
                action.callback = resolve;
                action.reject = reject;
            });
            this.actionLookups[actionType] = action;
        }

        return action;
    }

    _verifyAwaitedActionsCalled() {
        Object.keys(this.actionLookups).forEach(actionType => {
            const action = this.actionLookups[actionType];
            if (action.count === 0 && action.reject) {
                action.reject(
                    new Error(actionType + ' was waited for but never called')
                );
            }
        });
    }

    run(sagas = [], ...args) {
        const task = this.start(sagas, ...args);
        if (task.done != null) {
            return task.done;
        } else {
            return task.toPromise();
        }
    }

    start(sagas = [], ...args) {
        const task = this.sagaMiddleware.run(sagas, ...args);
        const onDone = () => this._verifyAwaitedActionsCalled();
        const onCatch = e => this._handleRootSagaException(e);
        if (task.done != null) {
            task.done.then(onDone);
            task.done.catch(onCatch);
        } else {
            const taskPromise = task.toPromise();
            taskPromise.then(onDone);
            taskPromise.catch(onCatch);
        }
        return task;
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

    setState(newState) {
        deprecate('setState has been deprecated. Please use updateState.');
        this.store.dispatch({type: SET_STATE_TYPE, payload: newState});
    }

    updateState(newState) {
        this.store.dispatch({type: UPDATE_STATE_TYPE, payload: newState});
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
        const action = this.actionLookups[actionType];

        return action ? action.count > 0 : false;
    }

    numCalled(actionType) {
        const action = this.actionLookups[actionType];

        return action && action.count || 0;
    }

    waitFor(actionType, futureOnly = false) {
        return this._addAction(actionType, futureOnly).promise;
    }

    getActionsCalled() {
        deprecate('getActionsCalled has been deprecated. Please use getCalledActions.');
        return this.calledActions;
    }

    getLastActionCalled(num = 1) {
        deprecate('getLastActionCalled has been deprecated. Please use getLatestCalledAction or getLatestCalledActions.');
        return this.calledActions.slice(-1 * num);
    }
}

function wrapReducers (reducerList) {
    return Object.keys(reducerList).reduce((result, name) => {
        result[name] = (state, action) => {
            const reducer = reducerList[name];
            const {payload, type} = action;
            let newState = reducer(state, action);

            if ([SET_STATE_TYPE, UPDATE_STATE_TYPE].indexOf(type) > -1 && payload[name]) {
                newState = Object.assign({}, state, payload[name]);
            }

            return newState;
        };
        return result;
    }, {});
}

function deprecate(txt = '') {
    console.warn(`[redux-saga-tester] Warning: ${txt}`);
}
