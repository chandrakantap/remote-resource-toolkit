import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer/dist/internal';

import { EMPTY_OBJECT } from './constants';
import { ApiCallStatus } from './types';

export type ResourceParams = {
  [key: string]: string | boolean | number | null | undefined;
};

export interface RemoteResource<
  R = any,
  Q extends ResourceParams = ResourceParams,
> {
  status: ApiCallStatus;
  resource?: R;
  resourceKey?: string;
  resourceParams?: Q;
  message?: string;
}

export const defaultRemoteResourceState: RemoteResource = {
  status: 'INIT',
};

export interface RemoteResourceState {
  [key: string]: RemoteResource;
}

type RemoteSliceAction<Payload extends object = {}> = PayloadAction<
  Payload & { resourceName: string }
>;

/**
 * Reducer function type which accepts RemoteSliceAction as action
 */
type Reducerfn<Payload extends object = {}> = (
  state: WritableDraft<RemoteResourceState>,
  action: RemoteSliceAction<Payload>,
) => void;

const initialState: RemoteResourceState = EMPTY_OBJECT;

const deleteReducer: Reducerfn = (state, action) => {
  const { resourceName } = action.payload;
  delete state[resourceName];
};

const setStatusReducer: Reducerfn<{ status: ApiCallStatus }> = (
  state,
  action,
) => {
  const { resourceName, status } = action.payload;
  if (!state[resourceName]) {
    state[resourceName] = { status };
  } else {
    state[resourceName].status = status;
  }
};

const abortReducer: Reducerfn = (state, action) => {
  const { resourceName } = action.payload;
  if (state[resourceName] && state[resourceName].status === 'IN_PROGRESS') {
    state[resourceName].status = 'INIT';
  }
};

const setStateReducer: Reducerfn<{ resourceState: RemoteResource }> = (
  state,
  action,
) => {
  const { resourceName, resourceState } = action.payload;
  state[resourceName] = resourceState;
};

const slice = createSlice({
  name: 'remoteResourceV2',
  initialState,
  reducers: {
    setState: setStateReducer,
    removeState: deleteReducer,
    setStatus: setStatusReducer,
    abort: abortReducer,
  },
});

export const {
  actions: remoteResourceActions,
  reducer: remoteResourceReducer,
} = slice;
