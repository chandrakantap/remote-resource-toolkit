import { Action, configureStore, ThunkAction } from '@reduxjs/toolkit';

import { remoteResourceReducer } from './remoteResourceSlice';
import {remoteResourceMapReducer} from './remoteResourceMapSlice';

const store = configureStore({
  reducer: {
    remoteResource: remoteResourceReducer,
    remoteResourceMap:remoteResourceMapReducer
  },
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export type GetStateFn = () => RootState;
export type AppThunk<ThunkArgs, ReturnType> = ThunkAction<
  ReturnType,
  RootState,
  ThunkArgs,
  Action<string>
>;
