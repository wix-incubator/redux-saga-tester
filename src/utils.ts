import { SET_STATE_TYPE, UPDATE_STATE_TYPE } from './constants';

// export const wrapReducers = reducerList => {
//   return Object.keys(reducerList).reduce((result, name) => {
//     result[name] = (state, action) => {
//       const reducer = reducerList[name];
//       const { payload, type } = action;
//       let newState = reducer(state, action);
//
//       if (
//         [SET_STATE_TYPE, UPDATE_STATE_TYPE].indexOf(type) > -1 &&
//         payload[name]
//       ) {
//         newState = Object.assign({}, state, payload[name]);
//       }
//
//       return newState;
//     };
//     return result;
//   }, {});
// };
