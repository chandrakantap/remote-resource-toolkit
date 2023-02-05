import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EMPTY_OBJECT } from './constants';
import { ApiCallStatus } from './types';
import { WritableDraft } from 'immer/dist/internal';

export type ResourceParams = {
  [key: string]: string | boolean | number | null | undefined;
};

export interface RemoteResource<R = any, Q extends ResourceParams = ResourceParams> {
  status: ApiCallStatus;
  resource?: R;
  params?: Q;
  message?: string;
}

export const defaultRemoteResourceState: RemoteResource = {
  status: 'INIT',
};

export interface SliceState {
  [key: string]: {
    [key: string]: RemoteResource;
  };
}

/**
 * Wrapper type of PayloadAction which add resourceName and resourceKey to every action
 */
type RemoteSliceAction<Payload extends object = {}> = PayloadAction<
  Payload & { resourceName: string; resourceKey: string }
>;

/**
 * Reducer function type which accepts RemoteSliceAction as action
 */
type Reducerfn<Payload extends object = {}> = (
  state: WritableDraft<SliceState>,
  action: RemoteSliceAction<Payload>
) => void;

const initialState: SliceState = EMPTY_OBJECT;

/**
 * Deletes and resource from redux
 * if resoureKey is all then all the resources will be removed.
 */
const deleteReducer: Reducerfn = (state, action) => {
  const { resourceName, resourceKey } = action.payload;
  if (resourceKey === 'all') {
    delete state[resourceName];
  } else {
    delete state[resourceName][resourceKey];
  }
};

const setStatusReducer: Reducerfn<{ status: ApiCallStatus }> = (state, action) => {
  const { resourceName, resourceKey, status } = action.payload;
  if (!state[resourceName]) {
    state[resourceName] = { [resourceKey]: { status } };
  } else {
    state[resourceName][resourceKey].status = status;
  }
};

const abortReducer: Reducerfn = (state, action) => {
  const { resourceName, resourceKey } = action.payload;
  if (
    state[resourceName] &&
    state[resourceName][resourceKey] &&
    state[resourceName][resourceKey].status === 'IN_PROGRESS'
  ) {
    state[resourceName][resourceKey].status = 'INIT';
  }
};

const setStateReducer: Reducerfn<{ resourceState: RemoteResource }> = (state, action) => {
  const { resourceName, resourceKey, resourceState } = action.payload;
  if (!state[resourceName]) {
    state[resourceName] = { [resourceKey]: resourceState };
  } else {
    state[resourceName][resourceKey] = resourceState;
  }
};

const slice = createSlice({
  name: 'remoteResourceMap',
  initialState,
  reducers: {
    setState: setStateReducer,
    removeState: deleteReducer,
    setStatus: setStatusReducer,
    abort: abortReducer,
  },
});

export const { actions: remoteResourceMapActions, reducer: remoteResourceMapReducer } = slice;
