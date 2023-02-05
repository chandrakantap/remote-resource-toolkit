import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EMPTY_OBJECT } from 'common/constants';
import { ApiCallStatus } from 'common/types';
import { WritableDraft } from 'immer/dist/internal';

export type ResourceParams = {
  [key: string]: string | boolean | number | null | undefined;
};

export interface RemoteResource<R = any, Q extends ResourceParams = ResourceParams> {
  status: ApiCallStatus;
  resource?: R;
  resourceKey?: string;
  resourceParams?: Q;
  message?: string;
}

export const defaultRemoteResourceState: RemoteResource = {
  status: 'INIT',
};

export interface SliceState {
  [key: string]: RemoteResource;
}

type RemoteSliceAction<Payload extends object = {}> = PayloadAction<
  Payload & { resourceName: string }
>;

/**
 * Reducer function type which accepts RemoteSliceAction as action
 */
type Reducerfn<Payload extends object = {}> = (
  state: WritableDraft<SliceState>,
  action: RemoteSliceAction<Payload>
) => void;

const initialState: SliceState = EMPTY_OBJECT;

const deleteReducer: Reducerfn = (state, action) => {
  const { resourceName } = action.payload;
  delete state[resourceName];
};

const setStatusReducer: Reducerfn<{ status: ApiCallStatus }> = (state, action) => {
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

const setStateReducer: Reducerfn<{ resourceState: RemoteResource }> = (state, action) => {
  const { resourceName, resourceState } = action.payload;
  state[resourceName] = resourceState;
};

const slice = createSlice({
  name: 'remoteResource',
  initialState,
  reducers: {
    setState: setStateReducer,
    removeState: deleteReducer,
    setStatus: setStatusReducer,
    abort: abortReducer,
  },
});

export const { actions: remoteResourceActions, reducer: remoteResourceReducer } = slice;
